const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdf = require('pdf-parse');
const axios = require('axios');
const path = require('path');
const { Client } = require('minio');
const { getDB } = require('../db');


// MinIO Client
const minioClient = new Client({
    endPoint: 'minio',
    port: 9000,
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
});

// Ensure bucket exists and has public read policy
const BUCKET_NAME = 'cvs';
minioClient.bucketExists(BUCKET_NAME, (err, exists) => {
    if (err) {
        console.error('Error checking bucket:', err);
    } else {
        const policy = {
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Allow',
                    Principal: { AWS: ['*'] },
                    Action: ['s3:GetObject'],
                    Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`]
                }
            ]
        };

        if (!exists) {
            minioClient.makeBucket(BUCKET_NAME, 'us-east-1', (err) => {
                if (err) console.error('Error creating bucket:', err);
                else {
                    console.log('✅ Bucket "cvs" created successfully');
                    // Set policy
                    minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy), (err) => {
                        if (err) console.error('Error setting bucket policy:', err);
                        else console.log('✅ Bucket policy set to PUBLIC READ');
                    });
                }
            });
        } else {
            console.log('✅ Bucket "cvs" already exists');
             // Always ensure policy on restart
             minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy), (err) => {
                if (err) console.error('Error setting bucket policy:', err);
                else console.log('✅ Bucket policy set to PUBLIC READ');
            });
        }
    }
});

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed!'), false);
        }
    }
});

// Ollama client - uses Docker service name
const ollama = axios.create({
    baseURL: process.env.OLLAMA_HOST || 'http://ollama:11434',
    timeout: 300000 // 5 minutes
});

// Extract CV information using Ollama
async function extractWithOllama(pdfText) {
    try {
        // Take first 3000 characters where personal info usually is
        // Context from the top of the document where the form is usually located
        const relevantText = pdfText.substring(0, 5000);
        
        const prompt = `You are a robotic data extraction unit. Accuracy is the only metric. 
### SOURCE:
Analyze ONLY the "FORMULAIRE DE PRE-EMBAUCHE" section. Ignore the rest of the CV.

### MECHANICAL EXTRACTION RULES:
1. **Name Splitting (STRICT)**:
   - "Nom": Surname only.
   - "Prénom": First name only.
   - Example: "Smith John" -> Nom: "Smith", Prénom: "John". NEVER repeat the full name.

2. **Form Isolation (FORBIDDEN CV SCAN)**:
   - "Date d'embauche": Extract ONLY from the specific form box. If empty, return "-". DO NOT search the CV text.
   - "Votre dernier diplome": Find the label "Votre dernier diplôme". Extract ONLY the text in that specific row. If empty, return "-".
   - "Date de naissance", "Adress Actuel", "Post Actuel", "Société", "Salaire net Actuel": Extract verbatim from form boxes. If blank, return "-".

3. **English Grid (DIRECT HEADER REPLACEMENT)**:
   - Locate: "Langue:votre niveau en Anglais technique?"
   - There are 3 Columns: Col 1 is "Faible", Col 2 is "Moyen", Col 3 is "Bien".
   - There are 3 Rows: Row 1 is "Lu", Row 2 is "Ecrit", Row 3 is "Parlé".
   - **RULE**: Identify the column index (1, 2, or 3) where "oui" or a mark exists for each row.
   - **OUTPUT MAP**: 
     - If "oui" is in Col 1 -> value is "Faible".
     - If "oui" is in Col 2 -> value is "Moyen".
     - If "oui" is in Col 3 -> value is "Bien".
   - **CRITICAL**: NEVER return the word "oui". Always return the header name (Faible, Moyen, or Bien).

### CONSTRAINTS:
- No summaries. No conversational text.
- Return ONLY valid JSON.

Required JSON format:
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

CV TEXT:
${relevantText}

Final JSON Output:`;

        const response = await ollama.post('/api/generate', {
            model: 'llama3.2:latest',
            prompt: prompt,
            stream: false,
            options: {
                temperature: 0.1,
                num_predict: 600
            }
        });

        // Parse the response
        let rawResponse = response.data.response;
        console.log('🤖 Ollama Raw Response:', rawResponse);

        let cleaned = rawResponse
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();
        
        // Find the FIRST complete JSON object
        let extracted;
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1) {
            const jsonPart = cleaned.substring(firstBrace, lastBrace + 1);
            try {
                extracted = JSON.parse(jsonPart);
            } catch (err) {
                console.error('❌ JSON.parse failed on isolated part:', err.message);
                throw new Error('Invalid JSON structure from AI');
            }
        } else {
            console.error('❌ No JSON braces found in response');
            throw new Error('No JSON object found in AI response');
        }
        
        // Ensure all required fields are present, default to "-"
        const requiredFields = [
          "Nom",
          "Prénom",
          "Date de naissance",
          "Adress Actuel",
          "Post Actuel",
          "Société",
          "Date d'embauche",
          "Salaire net Actuel",
          "Votre dernier diplome"
        ];
        const result = {};
        requiredFields.forEach(f => {
          const val = extracted[f];
          result[f] = (val && val.trim() !== "" && val !== "string") ? val : "-";
        });

        // English skills handling - use French keys (Lu, Ecrit, Parlé)
        const eng = extracted["Votre niveau de l'anglais technique"];
        if (eng && typeof eng === "object") {
          result["Votre niveau de l'anglais technique"] = {
            Lu: eng.Lu || "-",
            Ecrit: eng.Ecrit || "-",
            Parlé: eng.Parlé || "-"
          };
        } else {
          result["Votre niveau de l'anglais technique"] = {
            Lu: "-",
            Ecrit: "-",
            Parlé: "-"
          };
        }
        return result;
        
    } catch (error) {
        console.error('Ollama extraction error:', error.message);
        throw error;
    }
}

// PUT /:id - Update a candidate (e.g. for comments)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const db = getDB();
        const { ObjectId } = require('mongodb');

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: 'Invalid ID' });
        }

        // Remove _id from updates if present
        delete updates._id;

        const result = await db.collection('candidats').updateOne(
            { _id: new ObjectId(id) },
            { $set: updates }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, error: 'Candidate not found' });
        }

        res.json({ success: true, message: 'Updated successfully' });
    } catch (error) {
        console.error('Update error:', error);
        res.status(500).json({ success: false, error: 'Failed to update' });
    }
});

// POST /extract - Upload and extract CV (note: no /api prefix here, it's added in app.js)
router.post('/extract', upload.single('cv'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                error: 'No PDF file uploaded' 
            });
        }

        console.log('📄 Processing CV:', req.file.originalname);

        // Upload to MinIO
        const fileName = `${Date.now()}-${req.file.originalname}`;
        await minioClient.putObject(
            BUCKET_NAME,
            fileName,
            req.file.buffer,
            req.file.size,
            { 'Content-Type': 'application/pdf' }
        );

        console.log('✅ CV uploaded to MinIO:', fileName);

        // Parse PDF
        const pdfData = await pdf(req.file.buffer);
        const pdfText = pdfData.text;

        console.log('✅ PDF parsed, text length:', pdfText.length);

        // Extract with Ollama
        console.log('🤖 Calling Ollama...');
        const extractedData = await extractWithOllama(pdfText);

        console.log('✅ Extraction complete');

        // Return extracted data
        res.json({
            success: true,
            data: extractedData,
            fileName: fileName,
            pdfText: pdfText.substring(0, 500) // First 500 chars for preview
        });

    } catch (error) {
        console.error('Error processing CV:', error);
        
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                error: 'Ollama service is not running. Please check Docker Compose.'
            });
        }
        
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to process CV'
        });
    }
});

// POST /save - Save the final CV data (manual + auto)
router.post('/save', async (req, res) => {
    try {
        const cvData = req.body;
        
        // Here you can save to MongoDB
        console.log('💾 Saving CV data:', cvData);
        
        // TODO: Add MongoDB save logic here
        // const candidate = new Candidate(cvData);
        // await candidate.save();
        
        const db = getDB();


        console.log('📦 Using DB:', db.databaseName);

        const newCandidat = {
            ...cvData,
            status: 'en Attente',
            createdAt: new Date(),
        };

        const result = await db.collection('candidats').insertOne(newCandidat);

        res.json({
            success: true,
            message: 'CV data saved successfully',
            data: {
                id: result.insertedId,
                ...newCandidat
            }
        });
        
    } catch (error) {
        console.error('Error saving CV:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save CV data'
        });
    }
});

// GET / - Get all candidates
    router.get('/', async (req, res) => {
        try {
            const db = getDB();
            const candidates = await db.collection('candidats')
                .find({})
                .sort({ createdAt: -1 })
                .toArray();
            
            res.json({
                success: true,
                count: candidates.length,
                data: candidates
            });
        } catch (error) {
            console.error('Error fetching candidates:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch candidates'
            });
        }
    });

    // DELETE /:id - Delete a candidate
    const { ObjectId } = require('mongodb');
    router.delete('/:id', async (req, res) => {
        try {
            const db = getDB();
            const { id } = req.params;

            if (!ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid ID format'
                });
            }

            const result = await db.collection('candidats').deleteOne({
                _id: new ObjectId(id)
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Candidate not found'
                });
            }

            res.json({
                success: true,
                message: 'Candidate deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting candidate:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete candidate'
            });
        }
    });

    // GET /health - Check if Ollama is running
    router.get('/health', async (req, res) => {
    try {
        await ollama.get('/api/tags');
        res.json({ 
            success: true, 
            ollamaRunning: true,
            message: 'Ollama is running'
        });
    } catch (error) {
        res.json({ 
            success: true, 
            ollamaRunning: false,
            message: 'Ollama is not running or not accessible'
        });
    }
});

module.exports = router;