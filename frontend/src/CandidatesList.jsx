import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./styles/CVExtractor.css"; // Reusing existing styles for consistency

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

const CandidatesList = () => {
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
        setCandidates(data.data);
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

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this candidate?"))
      return;

    try {
      const response = await fetch(`${API_URL}/api/cv/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        setCandidates(candidates.filter((c) => c._id !== id));
      } else {
        alert("Failed to delete candidate");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting candidate");
    }
  };

  const handleCommentChange = async (id, newComment) => {
    try {
      const _id = normalizeId(id);
      await fetch(`${API_URL}/api/cv/${_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recruiterComment: newComment }),
      });
      // Optimistically update local state
      setCandidates((prev) =>
        prev.map((c) =>
          normalizeId(c._id) === _id
            ? { ...c, recruiterComment: newComment }
            : c,
        ),
      );
    } catch (err) {
      console.error("Failed to save comment", err);
    }
  };

  const handleEnableForm = async (id) => {
    try {
      const _id = normalizeId(id);
      const response = await fetch(`${API_URL}/api/cv/${_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formStatus: "active" }),
      });
      const data = await response.json();
      if (data.success) {
        const updatedCandidate = data.data;
        setCandidates((prev) =>
          prev.map((c) =>
            normalizeId(c._id) === _id ? updatedCandidate : c,
          ),
        );
        const link = `${FRONTEND_URL}/form/${updatedCandidate.formToken}`;
        try {
          await navigator.clipboard.writeText(link);
          alert(`🚀 Formulaire activé. Lien copié dans le presse‑papier :\n\n${link}`);
          // Open the form in a new tab so the admin stays on the list page
          window.open(link, "_blank");
        } catch {
          alert(`🚀 Formulaire activé. Lien : ${link}`);
        }
      }
    } catch (err) {
      console.error("Failed to enable form", err);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const _id = normalizeId(id);
      await fetch(`${API_URL}/api/cv/${_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      // Update local state
      setCandidates((prev) =>
        prev.map((c) =>
          normalizeId(c._id) === _id ? { ...c, status: newStatus } : c,
        ),
      );
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };
  const handleHiringStatusChange = async (id, newHiringStatus) => {
    try {
      const _id = normalizeId(id);
      await fetch(`${API_URL}/api/cv/${_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hiringStatus: newHiringStatus }),
      });
      // Update local state
      setCandidates((prev) =>
        prev.map((c) =>
          normalizeId(c._id) === _id
            ? { ...c, hiringStatus: newHiringStatus }
            : c,
        ),
      );
    } catch (err) {
      console.error("Failed to update hiring status", err);
    }
  };

  if (loading) return <div className="loading-spinner">Loading...</div>;

  // Filter candidates: Show only those NOT Refusé and NOT Embaucé
  const activeCandidates = candidates.filter(
    (c) => c.status !== "Refusé" && c.hiringStatus !== "Embaucé",
  );

  return (
    <div className="cv-extractor-container">
      <div
        className="cv-extractor-card"
        style={{ maxWidth: "1400px", display: "block" }}
      >
        <div
          className="header"
          style={{ marginBottom: "2rem", flexWrap: "wrap" }}
        >
          <h1>👥 Liste des Candidats</h1>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="table-responsive">
          <table className="candidates-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Date Naissance</th>
                <th>Adresse</th>
                <th>Poste</th>
                <th>Société</th>
                <th>Date Embauche</th>
                <th>Salaire</th>
                <th>Diplôme</th>
                <th>Anglais</th>
                <th>Commentaire</th>
                <th>Statut</th>
                <th>Statut d'embauche</th>
                <th>CV</th>
                <th>Selection</th>
                <th>Formulaire</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeCandidates.length === 0 ? (
                <tr>
                  <td
                    colSpan="14"
                    style={{ textAlign: "center", padding: "2rem" }}
                  >
                    Aucun candidat en attente ou accepté
                  </td>
                </tr>
              ) : (
                activeCandidates.map((candidate) => {
                  // Parse English skills
                  let englishDisplay;
                  if (
                    candidate["Votre niveau de l'anglais technique"] &&
                    typeof candidate["Votre niveau de l'anglais technique"] ===
                      "object"
                  ) {
                    const { Lu, Ecrit, Parlé } =
                      candidate["Votre niveau de l'anglais technique"];
                    englishDisplay = (
                      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                        <li>Lu: {Lu || "-"}</li>
                        <li>Ecrit: {Ecrit || "-"}</li>
                        <li>Parlé: {Parlé || "-"}</li>
                      </ul>
                    );
                  } else {
                    // Fallback for legacy string data or when it's not an object
                    const englishValue = candidate["Votre niveau de l'anglais technique"];
                    if (typeof englishValue === "object" && englishValue !== null) {
                      // If it's an object but we didn't catch it above, display as JSON string
                      englishDisplay = (
                        <span className="badge">
                          {JSON.stringify(englishValue)}
                        </span>
                      );
                    } else {
                      // Normal string fallback
                      englishDisplay = (
                        <span className="badge">
                          {englishValue || "-"}
                        </span>
                      );
                    }
                  }

                  return (
                    <tr key={candidate._id}>
                      <td style={{ fontWeight: 600 }}>
                        {candidate.Nom || "-"}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {candidate["Prénom"] || "-"}
                      </td>
                      <td>{candidate["Date de naissance"] || "-"}</td>
                      <td>{candidate["Adress Actuel"] || "-"}</td>
                      <td>{candidate["Post Actuel"] || "-"}</td>
                      <td>{candidate["Société"] || "-"}</td>
                      <td>{candidate["Date d'embauche"] || "-"}</td>
                      <td>{candidate["Salaire net Actuel"] || "-"}</td>
                      <td>{candidate["Votre dernier diplome"] || "-"}</td>
                      <td style={{ minWidth: "150px" }}>{englishDisplay}</td>
                      <td style={{ minWidth: "200px" }}>
                        <textarea
                          className="comment-input"
                          rows="2"
                          defaultValue={candidate.recruiterComment || ""}
                          onBlur={(e) =>
                            handleCommentChange(candidate._id, e.target.value)
                          }
                          placeholder="Commentaire..."
                        />
                      </td>
                      <td>
                        <select
                          value={candidate.status || "en Attente"}
                          onChange={(e) =>
                            handleStatusChange(candidate._id, e.target.value)
                          }
                          className={`status-select ${candidate.status?.toLowerCase().replace(" ", "-")}`}
                        >
                          <option value="en Attente">en Attente</option>
                          <option value="Accepté">Accepté</option>
                          <option value="Refusé">Refusé</option>
                        </select>
                      </td>
                      <td>
                        <select
                          value={
                            candidate.hiringStatus ||
                            "Attente validation Candidat"
                          }
                          onChange={(e) =>
                            handleHiringStatusChange(
                              candidate._id,
                              e.target.value,
                            )
                          }
                          className={`status-select ${candidate.hiringStatus?.toLowerCase().replaceAll(" ", "-")}`}
                        >
                          <option value="Attente validation Candidat">
                            Attente validation Candidat
                          </option>
                          <option value="Embaucé">Embaucé</option>
                          <option value="Non Embauché">Non Embauché</option>
                        </select>
                      </td>
                      <td>
                        {candidate.cvLink ? (
                          <a
                            href={candidate.cvLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="download-link"
                          >
                            📄 Voir
                          </a>
                        ) : (
                          <span className="no-file">Aucun</span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => handleEnableForm(candidate._id)}
                          className="extract-button"
                          style={{
                            padding: "8px 12px",
                            fontSize: "0.85rem",
                            background:
                              candidate.formStatus === "active"
                                ? "#48bb78"
                                : "",
                          }}
                        >
                          {candidate.formStatus === "active"
                            ? "✅ Activé"
                            : "📋 Choisir"}
                        </button>
                      </td>
                      <td>
                        {candidate.qualifiedFormPath ? (
                          <a
                            href={candidate.qualifiedFormPath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="download-link"
                          >
                            📝 Form PDF
                          </a>
                        ) : (
                          <span className="no-file">-</span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(candidate._id)}
                          className="delete-btn"
                          title="Supprimer"
                          style={{ marginLeft: "10px" }}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CandidatesList;
