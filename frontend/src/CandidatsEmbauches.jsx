import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./styles/CVExtractor.css";
import "./styles/EvaluationSystem.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || "http://localhost:5173";

function normalizeId(id) {
  if (typeof id === "string") return id;
  if (id && typeof id === "object") {
    if (id.$oid) return id.$oid;
    try {
      const s = id.toString();
      if (s && s !== "[object Object]") return s;
    } catch {}
  }
  return String(id);
}

const SERVICES = [
  "Commercial",
  "RH",
  "Facturation",
  "Relance",
  "En Voie",
  "Harmonisation",
  "Commande",
  "Logistique",
  "Front Office",
  "Emailing",
  "AO",
  "Sourcing",
  "Info",
];

const CandidatsEmbauches = () => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const response = await fetch(`${API_URL}/api/cv`);
      const data = await response.json();
      if (data.success) {
        const allEmbaucheCandidates = data.data.filter((c) => c.hiringStatus === "Embaucé");
        const candidatesForDepart = allEmbaucheCandidates.filter(c => c.dateDepart);
        const candidatesForEmbauches = allEmbaucheCandidates.filter(c => !c.dateDepart);
        setCandidates(candidatesForEmbauches);
        // Potentially store candidatesForDepart in a global state or local storage if ListeDépart needs to fetch them
      } else {
        setError("Failed to load candidates");
      }
    } catch (err) {
      setError("Error fetching data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id, field, value) => {
    try {
      const _id = normalizeId(id);
      await fetch(`${API_URL}/api/cv/${_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      // Update local state
      setCandidates((prev) =>
        prev.map((c) =>
          normalizeId(c._id) === _id ? { ...c, [field]: value } : c,
        ),
      );
    } catch (err) {
      console.error(`Failed to update ${field}`, err);
    }
  };

  const handleActivateEval = async (id) => {
    try {
      const _id = normalizeId(id);
      const res = await fetch(`${API_URL}/api/cv/${_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evalStatus: "active" }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const updated = data.data;
        setCandidates((prev) =>
          prev.map((c) => (normalizeId(c._id) === _id ? updated : c)),
        );
        const link = `${FRONTEND_URL}/evaluation/${updated.evalToken}`;

        // Copier le lien dans le presse-papier uniquement
        try {
          await navigator.clipboard.writeText(link);
          alert(`🚀 Évaluation activée ! Lien copié dans le presse-papier :\n\n${link}`);
          // Open the evaluation form in a new tab automatically
          window.open(link, "_blank");
        } catch {
          alert(`🚀 Évaluation activée !\n\nLien : ${link}`);
        }
      } else {
        alert(
          `Impossible d'activer l'évaluation pour ce candidat.\n\n${
            data.error || "Vérifiez l'identifiant en base ou les logs serveur."
          }`,
        );
      }
    } catch (err) {
      alert("Erreur activation");
    }
  };

  const handleFileUpload = async (event, id) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("rapportStage", file); // 'rapportStage' should match the field name on the backend

    try {
      const _id = normalizeId(id);
      const response = await fetch(`${API_URL}/api/cv/${_id}/upload-rapport-stage`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        alert("Rapport de stage uploaded successfully!");
        fetchCandidates(); // Refresh data to show the new link
      } else {
        alert("Failed to upload rapport de stage: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Error uploading rapport de stage", err);
      alert("Error uploading rapport de stage.");
    }
  };



  const handleDownloadSingleCandidateDocs = (candidateId) => {
    alert("Préparation des documents pour le téléchargement. Cela peut prendre un moment...");
    const _id = normalizeId(candidateId);
    window.location.href = `${API_URL}/api/cv/${_id}/download-docs`;
  };

  if (loading) return <div className="loading-spinner">Loading...</div>;

  return (
    <div className="cv-extractor-container">
      <div
        className="cv-extractor-card"
        style={{ maxWidth: "1400px", display: "block" }}
      >
        <div className="header" style={{ marginBottom: "2rem" }}>
          <h1>🤝 Candidats Embauchés</h1>
          {/* Links removed as per user request */}
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="table-responsive">
          <table className="candidates-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Date d'embauche</th>
                <th>Salaire</th>
                <th>Service</th>
                <th>Date de formation</th>
                <th>Date d'évaluation</th>
                <th>Statut final</th>
                <th>Évaluation</th>
                <th>Score</th>
                <th>PDF</th>
                <th>Rapport Stage</th>
                <th>Date de départ</th>
                <th>Documents</th>
              </tr>
            </thead>
            <tbody>
              {candidates.length === 0 ? (
                <tr>
                  <td
                    colSpan="14"
                    style={{ textAlign: "center", padding: "2rem" }}
                  >
                    Aucun candidat embauché
                  </td>
                </tr>
              ) : (
                candidates.map((candidate) => (
                  <tr key={candidate._id}>
                    <td style={{ fontWeight: 600 }}>{candidate.Nom || "-"}</td>
                    <td style={{ fontWeight: 600 }}>
                      {candidate["Prénom"] || "-"}
                    </td>
                    <td>
                      <input
                        type="date"
                        className="comment-input"
                        style={{
                          padding: "5px",
                          fontSize: "0.85rem",
                          minWidth: "130px",
                        }}
                        defaultValue={candidate["Date d'embauche"] || ""}
                        onBlur={(e) =>
                          handleUpdate(
                            candidate._id,
                            "Date d'embauche",
                            e.target.value,
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="comment-input"
                        style={{
                          padding: "5px",
                          fontSize: "0.85rem",
                          minWidth: "80px",
                        }}
                        defaultValue={candidate.salaire || ""}
                        onBlur={(e) =>
                          handleUpdate(
                            candidate._id,
                            "salaire",
                            e.target.value,
                          )
                        }
                      />
                    </td>
                    <td>
                      <select
                        className={`status-select service-select ${candidate.service?.toLowerCase().replaceAll(" ", "-")}`}
                        style={{
                          padding: "5px",
                          fontSize: "0.85rem",
                          width: "100%",
                          minWidth: "150px",
                        }}
                        value={candidate.service || ""}
                        onChange={(e) =>
                          handleUpdate(candidate._id, "service", e.target.value)
                        }
                      >
                        <option value="">Sélectionner...</option>
                        {SERVICES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="date"
                        className="comment-input"
                        style={{
                          padding: "5px",
                          fontSize: "0.85rem",
                          minWidth: "130px",
                        }}
                        defaultValue={candidate.dateFormation || ""}
                        onBlur={(e) =>
                          handleUpdate(
                            candidate._id,
                            "dateFormation",
                            e.target.value,
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        className="comment-input"
                        style={{
                          padding: "5px",
                          fontSize: "0.85rem",
                          minWidth: "130px",
                        }}
                        defaultValue={candidate.dateEvaluation || ""}
                        onBlur={(e) =>
                          handleUpdate(
                            candidate._id,
                            "dateEvaluation",
                            e.target.value,
                          )
                        }
                      />
                    </td>
                    <td>
                      <select
                        className={`status-select final-status-select ${candidate.hiringFinalStatus?.toLowerCase().replaceAll(" ", "-")}`}
                        style={{
                          padding: "5px",
                          fontSize: "0.85rem",
                          width: "100%",
                          minWidth: "180px",
                        }}
                        value={candidate.hiringFinalStatus || ""}
                        onChange={(e) =>
                          handleUpdate(
                            candidate._id,
                            "hiringFinalStatus",
                            e.target.value,
                          )
                        }
                      >
                        <option value="">Sélectionner...</option>
                        <option value="Accepté">Accepté</option>
                        <option value="Prolongé la formation">
                          Prolongé la formation
                        </option>
                      </select>
                    </td>
                    {/* Évaluation column */}
                    <td>
                      {candidate.evalStatus === "submitted" ? (
                        <button
                          className="extract-button"
                          style={{
                            padding: "6px 10px",
                            fontSize: "0.8rem",
                            background: "#3182ce",
                          }}
                          onClick={() =>
                            navigate(
                              `/evaluation/admin/${normalizeId(candidate._id)}`,
                            )
                          }
                        >
                          ✍️ Corriger
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivateEval(candidate._id)}
                          className="extract-button"
                          style={{
                            padding: "6px 10px",
                            fontSize: "0.8rem",
                            background:
                              candidate.evalStatus === "active"
                                ? "#48bb78"
                                : "",
                          }}
                        >
                          {candidate.evalStatus === "active"
                            ? "✅ Lien actif"
                            : "📋 Activer"}
                        </button>
                      )}
                    </td>
                    {/* Score column */}
                    <td style={{ fontWeight: 600, textAlign: "center" }}>
                      {candidate.evalScore != null
                        ? `${candidate.evalScore}/38`
                        : "-"}
                    </td>
                    {/* PDF column */}
                    <td>
                      {candidate.evalPdfPath ? (
                        <a
                          href={candidate.evalPdfPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="download-link"
                        >
                          📝 Voir PDF
                        </a>
                      ) : (
                        <span className="no-file">-</span>
                      )}
                    </td>
                    {/* Rapport Stage column */}
                    <td>
                      <input type="file" onChange={(e) => handleFileUpload(e, candidate._id)} />
                      {candidate.rapportStagePath && (
                        <a href={candidate.rapportStagePath} target="_blank" rel="noopener noreferrer">
                          Voir Rapport
                        </a>
                      )}
                    </td>
                    <td>
                      <input
                        type="date"
                        className="comment-input"
                        style={{
                          padding: "5px",
                          fontSize: "0.85rem",
                          minWidth: "130px",
                        }}
                        defaultValue={candidate.dateDepart || ""}
                        onBlur={(e) =>
                          handleUpdate(
                            candidate._id,
                            "dateDepart",
                            e.target.value,
                          )
                        }
                      />
                    </td>
                    <td>
                      <button
                        onClick={() => handleDownloadSingleCandidateDocs(candidate._id)}
                        className="extract-button"
                        style={{ background: '#38a169', padding: '8px 12px', fontSize: '0.85rem' }}
                      >
                        💾
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CandidatsEmbauches;
