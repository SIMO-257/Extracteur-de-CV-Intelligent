const express = require("express");
const router = express.Router();
const multer = require("multer");
const pdf = require("pdf-parse");
const axios = require("axios");
const path = require("path");
const { Client } = require("minio");
const fs = require("fs");
const { PassThrough } = require("stream");
const { getDB } = require("../db");
const PDFDocument = require("pdfkit"); // Add this line to require pdfkit

// MinIO Client
const minioClient = new Client({
  endPoint: "minio",
  port: 9000,
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

// Ensure buckets exist and have public read policy
const BUCKETS = ["cvs", "qualified-candidats", "rapports-stage"]; // Added new bucket
const BUCKET_NAME = "cvs"; // Renamed for clarity for CVs
const RAPPORT_BUCKET_NAME = "rapports-stage"; // New bucket for rapports

BUCKETS.forEach((bucket) => {
  minioClient.bucketExists(bucket, (err, exists) => {
    if (err) {
      console.error(`Error checking bucket "${bucket}":`, err);
    } else {
      const policy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${bucket}/*`],
          },
        ],
      };

      if (!exists) {
        minioClient.makeBucket(bucket, "us-east-1", (err) => {
          if (err) console.error(`Error creating bucket "${bucket}":`, err);
          else {
            console.log(`✅ Bucket "${bucket}" created successfully`);
            minioClient.setBucketPolicy(
              bucket,
              JSON.stringify(policy),
              (err) => {
                if (err)
                  console.error(`Error setting policy for "${bucket}":`, err);
                else console.log(`✅ Policy set for "${bucket}"`);
              },
            );
          }
        });
      } else {
        console.log(`✅ Bucket "${bucket}" already exists`);
        minioClient.setBucketPolicy(bucket, JSON.stringify(policy), (err) => {
          if (err) console.error(`Error setting policy for "${bucket}":`, err);
          else console.log(`✅ Policy ensured for "${bucket}"`);
        });
      }
    }
  });
});

// Configure multer for CV file upload (memory storage for parsing)
const uploadCv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed!"), false);
    }
  },
});

// Configure multer for Rapport de Stage file upload (disk storage for saving)
const rapportStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'temp_uploads'); // Temporary local storage
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});
const uploadRapport = multer({
  storage: rapportStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit for reports
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF or Word documents are allowed for reports!"), false);
    }
  },
});

// Ollama client - uses Docker service name
const ollama = axios.create({
  baseURL: process.env.OLLAMA_HOST || "http://ollama:11434",
  timeout: 300000, // 5 minutes
});

//Exract Form from Page3:
function extractRecruitmentForm(pdfText) {
  const pages = pdfText.split("\f");

  // 1️⃣ Fast path: page 3 exists
  if (pages[2] && pages[2].includes("QUESTIONNAIRE DE RECRUTEMENT")) {
    return pages[2];
  }

  // 2️⃣ Fallback: search globally (robust)
  const marker = "QUESTIONNAIRE DE RECRUTEMENT";
  const idx = pdfText.indexOf(marker);

  if (idx !== -1) {
    // Take a safe slice after the marker
    return pdfText.slice(idx, idx + 6000);
  }

  // 3️⃣ Hard failure (true invalid PDF)
  const err = new Error("FORM_NOT_FOUND");
  err.code = "FORM_NOT_FOUND";
  throw err;
}

// Extract CV information using Ollama
async function extractWithOllama(pdfText) {
  try {
    // 1️⃣ Strict extraction: ONLY Page 3
    const formText = await extractRecruitmentForm(pdfText);

    // 2️⃣ Strict, minimal, deterministic prompt
    const prompt = `You are a STRICT data extraction engine.

ABSOLUTE RULES:
- Extract ONLY information explicitly written in the form.
- DO NOT infer, guess, normalize, or harmonize values.
- DO NOT make values consistent across fields.
- If a field is empty, unclear, or ambiguous, return "-".
- Output VALID JSON ONLY.
- NO explanations. NO comments. NO extra text.

JSON FORMAT (must match EXACTLY):
{
  "Nom": "string",
  "Prénom": "string",
  "Date de naissance": "string",
  "Adress Actuel": "string",
  "Post Actuel": "string",
  "Société": "string",
  "Date d'embauche": "string",
  "Salaire net Actuel": "string",
  "Votre dernier diplome": "string",
  "Votre niveau de l'anglais technique": {
    "Lu": "string",
    "Ecrit": "string",
    "Parlé": "string"
  }
}

CRITICAL EXTRACTION METHOD (MANDATORY):
For "Votre niveau de l'anglais technique", extraction MUST be done in ISOLATION.

STEP 1 — ROW ISOLATION (NO EXCEPTIONS):
- Isolate text belonging ONLY to "Lu".
- Isolate text belonging ONLY to "Ecrit".
- Isolate text belonging ONLY to "Parlé".
- Text from one row MUST NOT influence another row.
- Do NOT reuse or copy values across rows.

STEP 2 — PER-ROW ANALYSIS:
Each isolated row MUST be analyzed independently.

VALID PROFICIENCY LEVELS (EXACT WORDS ONLY):
- "Faible"
- "Moyen"
- "Bien"

VALID MARKERS:
- "X"
- "oui"

DECISION RULES (APPLY PER ROW):
- Detect proficiency levels ONLY if explicitly marked with "X" or "oui".
- If EXACTLY ONE level is marked → output that level.
- If ZERO levels are marked → output "-".
- If MORE THAN ONE level is marked → output "-" (DO NOT choose).
- NEVER select a level by frequency, similarity, or consistency.

STRICT PROHIBITIONS:
- DO NOT translate (e.g. Low, Medium, Good).
- DO NOT assume table alignment.
- DO NOT infer missing marks.
- DO NOT normalize results across rows.
- DO NOT guess even if one value appears dominant.

FAILURE SAFETY RULE:
- If table structure is unclear or text is ambiguous, return "-" for Lu, Ecrit, and Parlé.

FORM TEXT:
${formText}

JSON:`;

    // 3️⃣ Locked Ollama call (NO creativity)
    const response = await ollama.post("/api/generate", {
      model: "qwen2.5:latest",
      prompt,
      stream: false,
      options: {
        temperature: 0,
        top_p: 0.1,
        repeat_penalty: 1.1,
        num_ctx: 4096,
        num_predict: 500,
      },
    });

    // 4️⃣ Clean & parse response
    let raw = response.data.response.replace(/```json|```/g, "").trim();
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("No JSON object returned by model");
    }

    const extracted = JSON.parse(raw.slice(firstBrace, lastBrace + 1));

    // 5️⃣ Enforce schema & defaults (ANTI-HALLUCINATION)
    const result = {
      Nom: extracted["Nom"] || "-",
      Prénom: extracted["Prénom"] || "-",
      "Date de naissance": extracted["Date de naissance"] || "-",
      "Adress Actuel": extracted["Adress Actuel"] || "-",
      "Post Actuel": extracted["Post Actuel"] || "-",
      Société: extracted["Société"] || "-",
      "Date d'embauche": extracted["Date d'embauche"] || "-",
      "Salaire net Actuel": extracted["Salaire net Actuel"] || "-",
      "Votre dernier diplome": extracted["Votre dernier diplome"] || "-",
      "Votre niveau de l'anglais technique": {
        Lu: extracted?.["Votre niveau de l'anglais technique"]?.Lu || "-",
        Ecrit: extracted?.["Votre niveau de l'anglais technique"]?.Ecrit || "-",
        Parlé: extracted?.["Votre niveau de l'anglais technique"]?.Parlé || "-",
      },
    };

    return result;
  } catch (err) {
    console.error("❌ Ollama extraction failed:", err.message);
    throw err;
  }
}

// async function extractWithOllama(pdfText) {
//     try {
//         // Take first 3000 characters where personal info usually is
//         // Context from the top of the document where the form is usually located
//         const relevantText = pdfText.substring(0, 5000);

//         const prompt = `You are a robotic data extraction unit. Accuracy is the only metric.
// ### SOURCE:
// Analyze ONLY the "FORMULAIRE DE PRE-EMBAUCHE" section. Ignore the rest of the CV.

// ### MECHANICAL EXTRACTION RULES:
// 1. **Name Splitting (STRICT)**:
//    - "Nom": Surname only.
//    - "Prénom": First name only.
//    - Example: "Smith John" -> Nom: "Smith", Prénom: "John". NEVER repeat the full name.

// 2. **Form Isolation (FORBIDDEN CV SCAN)**:
//    - "Date d'embauche": Extract ONLY from the specific form box. If empty, return "-". DO NOT search the CV text.
//    - "Votre dernier diplome": Find the label "Votre dernier diplôme". Extract ONLY the text in that specific row. If empty, return "-".
//    - "Date de naissance", "Adress Actuel", "Post Actuel", "Société", "Salaire net Actuel": Extract verbatim from form boxes. If blank, return "-".

// 3. **English Grid (DIRECT HEADER REPLACEMENT)**:
//    - Locate: "Langue:votre niveau en Anglais technique?"
//    - There are 3 Columns: Col 1 is "Faible", Col 2 is "Moyen", Col 3 is "Bien".
//    - There are 3 Rows: Row 1 is "Lu", Row 2 is "Ecrit", Row 3 is "Parlé".
//    - **RULE**: Identify the column index (1, 2, or 3) where "oui" or a mark exists for each row.
//    - **OUTPUT MAP**:
//      - If "oui" is in Col 1 -> value is "Faible".
//      - If "oui" is in Col 2 -> value is "Moyen".
//      - If "oui" is in Col 3 -> value is "Bien".
//    - **CRITICAL**: NEVER return the word "oui". Always return the header name (Faible, Moyen, or Bien).

// ### CONSTRAINTS:
// - No summaries. No conversational text.
// - Return ONLY valid JSON.

// Required JSON format:
// {
//   "Nom": "string",
//   "Prénom": "string",
//   "Date de naissance": "string",
//   "Adress Actuel": "string",
//   "Post Actuel": "string",
//   "Société": "string",
//   "Date d'embauche": "string",
//   "Salaire net Actuel": "string",
//   "Votre dernier diplome": "string",
//   "Votre niveau de l'anglais technique": {
//       "Lu": "string",
//       "Ecrit": "string",
//       "Parlé": "string"
//   }
// }

// CV TEXT:
// ${relevantText}

// Final JSON Output:`;

//         const response = await ollama.post('/api/generate', {
//             model: 'qwen2.5:latest',
//             prompt: prompt,
//             stream: false,
//             options: {
//                 temperature: 0,
//                 num_predict: 600
//             }
//         });

//         // Parse the response
//         let rawResponse = response.data.response;
//         console.log('🤖 Ollama Raw Response:', rawResponse);

//         let cleaned = rawResponse
//             .replace(/```json/g, '')
//             .replace(/```/g, '')
//             .trim();

//         // Find the FIRST complete JSON object
//         let extracted;
//         const firstBrace = cleaned.indexOf('{');
//         const lastBrace = cleaned.lastIndexOf('}');

//         if (firstBrace !== -1 && lastBrace !== -1) {
//             const jsonPart = cleaned.substring(firstBrace, lastBrace + 1);
//             try {
//                 extracted = JSON.parse(jsonPart);
//             } catch (err) {
//                 console.error('❌ JSON.parse failed on isolated part:', err.message);
//                 throw new Error('Invalid JSON structure from AI');
//             }
//         } else {
//             console.error('❌ No JSON braces found in response');
//             throw new Error('No JSON object found in AI response');
//         }

//         // Ensure all required fields are present, default to "-"
//         const requiredFields = [
//           "Nom",
//           "Prénom",
//           "Date de naissance",
//           "Adress Actuel",
//           "Post Actuel",
//           "Société",
//           "Date d'embauche",
//           "Salaire net Actuel",
//           "Votre dernier diplome"
//         ];
//         const result = {};
//         requiredFields.forEach(f => {
//           const val = extracted[f];
//           result[f] = (val && val.trim() !== "" && val !== "string") ? val : "-";
//         });

//         // English skills handling - use French keys (Lu, Ecrit, Parlé)
//         const eng = extracted["Votre niveau de l'anglais technique"];
//         if (eng && typeof eng === "object") {
//           result["Votre niveau de l'anglais technique"] = {
//             Lu: eng.Lu || "-",
//             Ecrit: eng.Ecrit || "-",
//             Parlé: eng.Parlé || "-"
//           };
//         } else {
//           result["Votre niveau de l'anglais technique"] = {
//             Lu: "-",
//             Ecrit: "-",
//             Parlé: "-"
//           };
//         }
//         return result;

//     } catch (error) {
//         console.error('Ollama extraction error:', error.message);
//         throw error;
//     }
// }

// PATCH /qualified/:id - Submit recruitment form for a candidate
router.patch("/qualified/:id", async (req, res) => {
  console.log("⚙️ PATCH /qualified/:id route called");
  try {
    const { id } = req.params;
    const formData = req.body;
    const db = getDB();
    const { ObjectId } = require("mongodb");

    console.log("Received ID:", id);
    console.log("Received formData:", JSON.stringify(formData, null, 2));

    if (!ObjectId.isValid(id)) {
      console.log("Invalid ID:", id);
      return res.status(400).json({ success: false, error: "Invalid ID" });
    }

    console.log("Starting PDF generation...");
    // 1. Generate PDF
    const doc = new PDFDocument({ margin: 50 });
    const stream = new PassThrough();

    doc.pipe(stream);

    // PDF Styling & Content
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("Questionnaire de Recrutement", { align: "center" });
    doc.moveDown(1.5);
    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`ID Candidat: ${id}`, { align: "right" });
    doc.text(`Date de soumission: ${new Date().toLocaleDateString()}`, {
      align: "right",
    });
    doc.moveDown(2);

    const questions = [
      { key: "presentezVous", label: "1. Présentez-vous ?" },
      { key: "apporteEtudes", label: "2. Que vous ont apporté vos études ?" },
      {
        key: "tempsRechercheEmploi",
        label: "3. Depuis combien de temps cherchez-vous un emploi ?",
      },
      {
        key: "qualitesDefauts",
        label: "4. Quelles sont vos qualités ? Quels sont vos défauts ?",
      },
      {
        key: "seulOuEquipe",
        label: "5. Préférez-vous travailler seul ou en équipe ? Pourquoi ?",
      },
      {
        key: "professionParents",
        label: "6. Quelle est la profession de vos parents ?",
      },
      {
        key: "pretentionsSalariales",
        label: "7. Quelles sont vos prétentions salariales ?",
      },
      {
        key: "lastExperience",
        label: "8. Tasks and responsibilities of last internship/job:",
      },
    ];

    questions.forEach((q) => {
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .fillColor("#2d3748")
        .text(q.label);
      doc.moveDown(0.5);
      // Ensure formData[q.key] is a string or handle potential non-string values
      const answer = String(formData[q.key] || "-");
      doc
        .fontSize(12)
        .font("Helvetica")
        .fillColor("#1a202c")
        .text(answer, { indent: 20 });
      doc.moveDown(1.5);
      doc
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .strokeColor("#cbd5e0")
        .lineWidth(0.5)
        .stroke();
      doc.moveDown(1.5);
    });

    doc.end();
    console.log("PDF generation finished.");

    console.log("Starting MinIO upload...");
    // 2. Upload to MinIO (bucket: qualified-candidats)
    const QUALIFIED_BUCKET = "qualified-candidats";
    const fileName = `form-${id}-${Date.now()}.pdf`;

    // Collect buffer from stream
    const buffers = [];
    stream.on("data", (b) => buffers.push(b));

    await new Promise((resolve, reject) => {
      stream.on("end", async () => {
        const buffer = Buffer.concat(buffers);
        try {
          await minioClient.putObject(
            QUALIFIED_BUCKET,
            fileName,
            buffer,
            buffer.length,
            { "Content-Type": "application/pdf" },
          );
          console.log("MinIO upload successful:", fileName);
          resolve();
        } catch (err) {
          console.error("MinIO upload failed:", err);
          reject(err);
        }
      });
      stream.on("error", (err) => {
        console.error("PDF stream error during MinIO upload:", err);
        reject(err);
      });
    });

    const pdfUrl = `http://localhost:9000/${QUALIFIED_BUCKET}/${fileName}`;
    console.log("PDF URL generated:", pdfUrl);

    console.log("Starting MongoDB update...");
    // 3. Update MongoDB
    const result = await db.collection("candidats").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          qualifiedFormPath: pdfUrl,
          formSubmittedAt: new Date(),
          formStatus: "submitted",
        },
      },
    );

    if (result.matchedCount === 0) {
      console.log("Candidate not found for ID:", id);
      return res
        .status(404)
        .json({ success: false, error: "Candidate not found" });
    }
    console.log("MongoDB update successful.");

    res.json({
      success: true,
      message: "Formulaire enregistré et PDF généré avec succès",
      pdfUrl: pdfUrl,
    });
  } catch (error) {
    console.error("Qualified submission error (caught by handler):", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to process recruitment form" });
  }
});

// GET /health - Check if Ollama is running
router.get("/health", async (req, res) => {
  try {
    // Try to reach Ollama - use a simple tags check
    const response = await ollama.get("/api/tags");
    res.json({
      success: true,
      ollamaRunning: true,
      modelCount: response.data.models ? response.data.models.length : 0,
    });
  } catch (error) {
    console.error("Ollama health check failed:", error.message);
    res.json({
      success: true,
      ollamaRunning: false,
      error: error.message,
    });
  }
});

// GET /token/:token - Get candidate by form token (Hashed Access)
router.get("/token/:token", async (req, res) => {
  try {
    const { token } = req.params;
    console.log("🔍 Checking access for token:", token);

    const db = getDB();
    const candidate = await db
      .collection("candidats")
      .findOne({ formToken: token });

    if (!candidate) {
      console.warn("⚠️ No candidate found for token:", token);
      return res
        .status(404)
        .json({ success: false, error: "Invalid or expired link" });
    }

    console.log(
      "✅ Candidate found:",
      candidate.Nom,
      "| Status:",
      candidate.formStatus,
    );
    res.json({ success: true, data: candidate });
  } catch (error) {
    console.error("Fetch by token error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch candidate" });
  }
});

// GET /eval/token/:token - Get candidate by evaluation token
router.get("/eval/token/:token", async (req, res) => {
  try {
    const { token } = req.params;
    console.log("🔍 Checking evaluation access for token:", token);
    const db = getDB();

    const candidate = await db
      .collection("candidats")
      .findOne({ evalToken: token });

    if (!candidate) {
      console.warn("⚠️ No candidate found for evaluation token:", token);
      return res
        .status(404)
        .json({ success: false, error: "Evaluation link invalid or expired" });
    }

    res.json({ success: true, data: candidate });
  } catch (error) {
    console.error("Eval token fetch error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// GET /:id - Get a single candidate
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    const { ObjectId } = require("mongodb");

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid ID" });
    }

    const candidate = await db
      .collection("candidats")
      .findOne({ _id: new ObjectId(id) });

    if (!candidate) {
      return res
        .status(404)
        .json({ success: false, error: "Candidate not found" });
    }

    res.json({ success: true, data: candidate });
  } catch (error) {
    console.error("Fetch error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch candidate" });
  }
});

// PUT /:id - Update a candidate (e.g. for comments or enabling form)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const db = getDB();
    const { ObjectId } = require("mongodb");
    const crypto = require("crypto");

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid ID" });
    }

    // If enabling the form, generate a secure token if it doesn't exist
    if (updates.formStatus === "active") {
      console.log("🔑 Activating form for candidate ID:", id);
      const candidate = await db
        .collection("candidats")
        .findOne({ _id: new ObjectId(id) });
      if (candidate && !candidate.formToken) {
        updates.formToken = crypto.randomBytes(16).toString("hex");
        console.log("🆕 Generated new token:", updates.formToken);
      } else if (candidate) {
        console.log("ℹ️ Using existing token:", candidate.formToken);
      }
    }

    // If enabling evaluation, generate an eval token if missing
    if (updates.evalStatus === "active") {
      console.log("🧪 Activating evaluation for candidate ID:", id);
      const candidate = await db
        .collection("candidats")
        .findOne({ _id: new ObjectId(id) });
      if (candidate && !candidate.evalToken) {
        updates.evalToken = crypto.randomBytes(16).toString("hex");
        console.log("🆕 Generated eval token:", updates.evalToken);
      } else if (candidate) {
        console.log("ℹ️ Existing eval token:", candidate.evalToken);
      }
    }

    // Remove _id from updates if present
    delete updates._id;

    const result = await db
      .collection("candidats")
      .updateOne({ _id: new ObjectId(id) }, { $set: updates });

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Candidate not found" });
    }

    // Return the updated data so frontend can get the token
    const updatedCandidate = await db
      .collection("candidats")
      .findOne({ _id: new ObjectId(id) });

    res.json({
      success: true,
      message: "Updated successfully",
      data: updatedCandidate,
    });
  } catch (error) {
    console.error("Update error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to update candidate" });
  }
});

// PUT /eval/activate/:id - Activate evaluation for a hired candidate
router.put("/eval/activate/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDB();
    const { ObjectId } = require("mongodb");
    const crypto = require("crypto");

    const token = crypto.randomBytes(16).toString("hex");

    let filter;
    if (ObjectId.isValid(id)) {
      console.log("⚙️ eval/activate id:", id, "ObjectId.isValid:", true);
      filter = { $or: [{ _id: new ObjectId(id) }, { _id: id }] };
    } else {
      console.log("⚙️ eval/activate id:", id, "ObjectId.isValid:", false);
      filter = { _id: id };
    }

    const existing = await db.collection("candidats").findOne(filter);
    console.log("🔎 existing by filter:", !!existing);
    if (!existing) {
      const fallback = await db
        .collection("candidats")
        .findOne({ _id: String(id) });
      console.log("🔎 fallback by string:", !!fallback);
      if (!fallback) {
        return res
          .status(404)
          .json({ success: false, error: "Candidate not found" });
      }
      filter = { _id: fallback._id };
    }

    await db.collection("candidats").updateOne(filter, {
      $set: { evalToken: token, evalStatus: "active" },
    });

    const updated = await db.collection("candidats").findOne(filter);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Eval activation error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to activate evaluation" });
  }
});

// PATCH /eval/submit/:id - Submit evaluation answers
router.patch("/eval/submit/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const answers = req.body;
    const db = getDB();
    const { ObjectId } = require("mongodb");

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid ID" });
    }

    const result = await db.collection("candidats").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          evalAnswers: answers,
          evalStatus: "submitted",
          evalSubmittedAt: new Date(),
        },
      },
    );

    res.json({ success: true, message: "Evaluation submitted" });
  } catch (error) {
    console.error("Eval submission error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to submit evaluation" });
  }
});

// PATCH /eval/correct/:id - Admin corrects the evaluation and generates PDF
router.patch("/eval/correct/:id", async (req, res) => {
  console.log("⚙️ PATCH /eval/correct/:id route called");
  try {
    const { id } = req.params;
    const { evalCorrection, evalScore } = req.body;
    const db = getDB();
    const { ObjectId } = require("mongodb");

    console.log("Received ID:", id);
    console.log("Received evalCorrection:", JSON.stringify(evalCorrection, null, 2));
    console.log("Received evalScore:", evalScore);

    if (!ObjectId.isValid(id)) {
      console.log("Invalid ID:", id);
      return res.status(400).json({ success: false, error: "Invalid ID" });
    }

    console.log("Fetching candidate data...");
    const candidate = await db
      .collection("candidats")
      .findOne({ _id: new ObjectId(id) });
    if (!candidate) {
      console.log("Candidate not found for ID:", id);
      return res
        .status(404)
        .json({ success: false, error: "Candidat non trouvé" });
    }
    console.log("Candidate found:", candidate.Nom, candidate.Prenom);

    // 1. Generate PDF with Correction
    console.log("Starting PDF generation...");
    const doc = new PDFDocument({ margin: 50 });
    const stream = new PassThrough();

    // Pipe BEFORE writing content so the stream receives data
    doc.pipe(stream);

    doc
      .fontSize(20)
      .text(`Évaluation Corrigée - Chargé d'Étude`, { align: "center" });
    doc.moveDown();
    doc
      .fontSize(14)
      .text(`Candidat : ${candidate["Prénom"] || ""} ${candidate.Nom || ""}`);
    doc.text(`Note Finale : ${parseInt(evalScore)}/38`);
    doc.moveDown();

    // Note: The 'questions' array here must match the one in AdminEvaluationCorrection.jsx
    const questions = [
      { id: "q1", text: "1. Rôle principal d'un chargé d'étude ?" },
      { id: "q2", text: "2. Erreurs critiques à éviter ?" },
      {
        id: "q3",
        text: "3. Comparaison fiche technique / offre fournisseur ?",
      },
      { id: "q4", text: "4. Inclusion des accessoires ?" },
      { id: "q5", text: "5. Vérifications avant envoi ?" },
      { id: "q6", text: "6. Exemple de non-conformité ?" },
      { id: "q7", text: "7. Risque WhatsApp ?" },
      { id: "q8", text: "8. Frais supplémentaires ?" },
      { id: "q9", text: "9. Conformité normes (ATEX, UL, etc.) ?" },
      { id: "q10", text: "10. Demande incomplète ?" },
      { id: "q11", text: "11. Doute technique ?" },
      { id: "q12", text: "12. Première info à identifier ?" },
      { id: "q13", text: "13. Étape après l'origine ?" },
      { id: "q14", text: "14. Cas UK/UK/ATIS ?" },
      { id: "q15", text: "15. Cas UK/UE/ATIS ?" },
      { id: "q16", text: "16. Cas UK/UE/Eurodistech ?" },
      { id: "q17", text: "17. Cas USA/UE ?" },
      { id: "q18", text: "18. Fournisseur différent du pays d'origine ?" },
      { id: "q19", text: "19. Prévenir RH ?" },
      { id: "q20", text: "20. Horaires officiels ?" },
      { id: "q21", text: "21. Absence urgente ?" },
      { id: "q22", text: "22. Certificat médical refusé ?" },
      { id: "q23", text: "23. Conséquences retard ?" },
      { id: "q24", text: "24. Absence non justifiée ?" },
      { id: "q25", text: "25. Compréhension règles RH ?" },
      { id: "q26", text: "26. Points flous internes ?" },
      { id: "q27", text: "27. Plan anti-malentendu ?" },
      { id: "q28", text: "28. Erreur collègue ?" },
      { id: "q29", text: "29. Tâche secondaire ?" },
      { id: "q30", text: "30. Désaccord chef ?" },
      { id: "q31", text: "31. Perturbation concentration ?" },
      { id: "q32", text: "32. Respect Open Space ?" },
      { id: "q33", text: "33. Difficulté 2 premières semaines ?" },
      { id: "q34", text: "34. Compétences renforcées ?" },
      { id: "q35", text: "35. Produits/Demandes complexes ?" },
      { id: "q36", text: "36. Bonnes pratiques ?" },
      { id: "q37", text: "37. Conseil futur recrue ?" },
      { id: "q38", text: "38. Points d'amélioration ?" },
    ];

    questions.forEach((q) => {
      doc.fontSize(10).fillColor("#2d3748").text(q.text, { bold: true });
      doc
        .fillColor("#4a5568")
        .text(
          `Réponse : ${(candidate.evalAnswers && candidate.evalAnswers[q.id]) || "N/A"
          }`,
        );
      const isTrue = evalCorrection[q.id];
      doc
        .fillColor(isTrue ? "#38a169" : "#e53e3e")
        .text(`Correction : ${isTrue ? "VRAI" : "FAUX"}`);
      doc.moveDown(0.5);
    });

    doc.end();
    console.log("PDF generation finished.");

    const QUALIFIED_BUCKET = "qualified-candidats";
    const fileName = `eval-${candidate.Nom}-${Date.now()}.pdf`;
    const chunks = [];
    stream.on("data", (c) => chunks.push(c));
    stream.on("end", async () => {
      console.log("PDF stream ended, preparing for MinIO upload...");
      const buffer = Buffer.concat(chunks);
      try {
        console.log("Starting MinIO upload for PDF...");
        await minioClient.putObject(
          QUALIFIED_BUCKET,
          fileName,
          buffer,
          buffer.length,
          { "Content-Type": "application/pdf" },
        );
        console.log("MinIO upload successful for PDF.");
        const pdfUrl = `http://localhost:9000/${QUALIFIED_BUCKET}/${fileName}`;
        console.log("PDF URL generated:", pdfUrl);

        console.log("Starting MongoDB update...");
        await db.collection("candidats").updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              evalCorrection,
              evalScore, // This is sent from the frontend, should be the count
              evalStatus: "corrected",
              evalPdfPath: pdfUrl,
            },
          },
        );
        console.log("MongoDB update successful.");
        res.json({ success: true, pdfUrl });
      } catch (error) {
        console.error("Error during MinIO upload or MongoDB update:", error);
        res
          .status(500)
          .json({ success: false, error: "Failed to save corrected evaluation" });
      }
    });
    stream.on("error", (err) => {
      console.error("PDF stream error during evaluation correction:", err);
      res.status(500).json({ success: false, error: "Error processing PDF stream" });
    });
  } catch (error) {
    console.error("Eval correction error (caught by handler):", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to correct evaluation" });
  }
});

// POST /extract - Upload and extract CV (note: no /api prefix here, it's added in app.js)
router.post("/extract", uploadCv.single("cv"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No PDF file uploaded",
      });
    }

    console.log("📄 Processing CV:", req.file.originalname);

    // Upload to MinIO
    const fileName = `${Date.now()}-${req.file.originalname}`;
    await minioClient.putObject(
      BUCKET_NAME,
      fileName,
      req.file.buffer,
      req.file.size,
      { "Content-Type": "application/pdf" },
    );

    console.log("✅ CV uploaded to MinIO:", fileName);

    // Parse PDF
    const pdfData = await pdf(req.file.buffer);
    const pdfText = pdfData.text;

    console.log("✅ PDF parsed, text length:", pdfText.length);

    // Extract with Ollama
    console.log("🤖 Calling Ollama...");
    const extractedData = await extractWithOllama(pdfText);

    console.log("✅ Extraction complete");

    // Return extracted data
    res.json({
      success: true,
      data: extractedData,
      fileName: fileName,
      pdfText: pdfText.substring(0, 500), // First 500 chars for preview
    });
  } catch (error) {
    console.error("Error processing CV:", error);

    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({
        success: false,
        error: "Ollama service is not running. Please check Docker Compose.",
      });
    }

    if (error.code === "FORM_NOT_FOUND") {
      return res.status(400).json({
        success: false,
        error:
          "Formulaire de recrutement introuvable. Le PDF doit contenir le questionnaire.",
      });
    }

    res.status(500).json({
      success: false,
      error: "Erreur lors de l'extraction des données: " + error.message,
    });
  }
});

// NEW ROUTE for uploading rapport de stage
router.post('/:id/upload-rapport-stage', uploadRapport.single('rapportStage'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const db = getDB();
    const { ObjectId } = require("mongodb");

    if (!ObjectId.isValid(id)) {
      // Clean up the uploaded file if ID is invalid
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: "Invalid ID" });
    }

    const candidate = await db.collection("candidats").findOne({ _id: new ObjectId(id) });
    if (!candidate) {
      // Clean up the uploaded file if candidate not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, error: 'Candidat not found.' });
    }

    // Read the file buffer from the temporary location
    const fileBuffer = fs.readFileSync(req.file.path);
    const minioFileName = `rapport-${id}-${Date.now()}${path.extname(req.file.originalname)}`;

    // Upload to MinIO
    await minioClient.putObject(
      RAPPORT_BUCKET_NAME,
      minioFileName,
      fileBuffer,
      fileBuffer.length,
      { 'Content-Type': req.file.mimetype }
    );

    // Remove the temporary file from disk
    fs.unlinkSync(req.file.path);

    const rapportMinioPath = `http://localhost:9000/${RAPPORT_BUCKET_NAME}/${minioFileName}`;

    // Update MongoDB
    await db.collection("candidats").updateOne(
      { _id: new ObjectId(id) },
      { $set: { rapportStagePath: rapportMinioPath } }
    );

    res.json({ success: true, message: 'Rapport de stage uploaded successfully.', filePath: rapportMinioPath });

  } catch (error) {
    console.error('Error uploading rapport de stage:', error);
    // Ensure temporary file is cleaned up even on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, error: 'Server error during upload.' });
  }
});

// POST /save - Save the final CV data (manual + auto)
router.post("/save", async (req, res) => {
  try {
    const cvData = req.body;

    // Here you can save to MongoDB
    console.log("💾 Saving CV data:", cvData);

    // TODO: Add MongoDB save logic here
    // const candidate = new Candidate(cvData);
    // await candidate.save();

    const db = getDB();

    console.log("📦 Using DB:", db.databaseName);

    const newCandidat = {
      ...cvData,
      status: "en Attente",
      hiringStatus: "Attente validation client",
      formStatus: "inactive",
      // Evaluation lifecycle defaults
      evalStatus: "inactive",
      evalAnswers: null,
      evalCorrection: null,
      evalScore: null,
      evalPdfPath: null,
      createdAt: new Date(),
    };

    const result = await db.collection("candidats").insertOne(newCandidat);

    res.json({
      success: true,
      message: "CV data saved successfully",
      data: {
        id: result.insertedId,
        ...newCandidat,
      },
    });
  } catch (error) {
    console.error("Error saving CV:", error);
    res.status(500).json({
      success: false,
      error: "Failed to save CV data",
    });
  }
});

// GET / - Get all candidates
router.get("/", async (req, res) => {
  try {
    const db = getDB();
    const candidates = await db
      .collection("candidats")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      count: candidates.length,
      data: candidates,
    });
  } catch (error) {
    console.error("Error fetching candidates:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch candidates",
    });
  }
});

// DELETE /:id - Delete a candidate
const { ObjectId } = require("mongodb");
router.delete("/:id", async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid ID format",
      });
    }

    const result = await db.collection("candidats").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Candidate not found",
      });
    }

    res.json({
      success: true,
      message: "Candidate deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting candidate:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete candidate",
    });
  }
});

module.exports = router;
