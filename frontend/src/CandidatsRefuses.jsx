import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./CVExtractor.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const CandidatsRefuses = () => {
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
        // Only show Refusé
        setCandidates(data.data.filter((c) => c.status === "Refusé"));
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

  const handleRestore = async (id) => {
    try {
      await fetch(`${API_URL}/api/cv/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "en Attente" }),
      });
      // Remove from this list
      setCandidates(candidates.filter((c) => c._id !== id));
    } catch (err) {
      console.error("Failed to restore candidate", err);
    }
  };

  if (loading) return <div className="loading-spinner">Loading...</div>;

  return (
    <div className="cv-extractor-container">
      <div
        className="cv-extractor-card"
        style={{ maxWidth: "1400px", display: "block" }}
      >
        <div className="header">
          <h1>🚫 Candidats Refusés</h1>
          <Link to="/candidates" className="back-link">
            ← Retour à la liste active
          </Link>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="table-responsive">
          <table className="candidates-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Poste</th>
                <th>Société</th>
                <th>Commentaire</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {candidates.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    style={{ textAlign: "center", padding: "2rem" }}
                  >
                    Aucun candidat refusé
                  </td>
                </tr>
              ) : (
                candidates.map((candidate) => (
                  <tr key={candidate._id}>
                    <td style={{ fontWeight: 600 }}>{candidate.Nom || "-"}</td>
                    <td style={{ fontWeight: 600 }}>
                      {candidate["Prénom"] || "-"}
                    </td>
                    <td>{candidate["Post Actuel"] || "-"}</td>
                    <td>{candidate["Société"] || "-"}</td>
                    <td>{candidate.recruiterComment || "-"}</td>
                    <td>
                      <button
                        onClick={() => handleRestore(candidate._id)}
                        className="extract-button"
                        style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                        title="Restaurer"
                      >
                        ↩ Restaurer
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

export default CandidatsRefuses;
