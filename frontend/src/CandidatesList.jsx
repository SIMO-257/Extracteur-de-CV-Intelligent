import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./CVExtractor.css"; // Reusing existing styles for consistency

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const CandidatesList = () => {
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
      await fetch(`${API_URL}/api/cv/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recruiterComment: newComment }),
      });
      // Optimistically update local state
      setCandidates((prev) =>
        prev.map((c) =>
          c._id === id ? { ...c, recruiterComment: newComment } : c,
        ),
      );
    } catch (err) {
      console.error("Failed to save comment", err);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await fetch(`${API_URL}/api/cv/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      // Update local state
      setCandidates((prev) =>
        prev.map((c) => (c._id === id ? { ...c, status: newStatus } : c)),
      );
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  if (loading) return <div className="loading-spinner">Loading...</div>;

  // Filter candidates: Show only those NOT Refusé
  const activeCandidates = candidates.filter((c) => c.status !== "Refusé");

  return (
    <div className="cv-extractor-container">
      <div
        className="cv-extractor-card"
        style={{ maxWidth: "1400px", display: "block" }}
      >
        <div className="header">
          <h1>👥 Liste des Candidats</h1>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <Link
              to="/refused"
              className="view-list-link"
              style={{ fontSize: "0.9rem" }}
            >
              🚫 Voir les Refusés
            </Link>
            <Link to="/" className="back-link">
              ← Retour
            </Link>
          </div>
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
                <th>CV</th>
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
                    // Fallback for legacy string data
                    englishDisplay = (
                      <span className="badge">
                        {candidate["Votre niveau de l'anglais technique"] ||
                          "-"}
                      </span>
                    );
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
