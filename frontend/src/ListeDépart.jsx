import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import "./styles/CVExtractor.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

const ListeDépart = () => {
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
        // Filter: Only show Embaucé candidates with a dateDepart
        setCandidates(data.data.filter((c) => c.hiringStatus === "Embaucé" && c.dateDepart));
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
      // Update local state - re-fetch candidates to ensure data consistency
      fetchCandidates();
    } catch (err) {
      console.error(`Failed to update ${field}`, err);
    }
  };

  if (loading) return <div className="loading-spinner">Loading...</div>;

  return (
    <div className="cv-extractor-container">
      <div
        className="cv-extractor-card"
        style={{ maxWidth: "1400px", display: "block" }}
      >
        <div className="header" style={{ marginBottom: "2rem" }}>
          <h1>👋 Candidats Partis</h1>

        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="table-responsive">
          <table className="candidates-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Date d'embauche</th>
                <th>Date de départ</th>
              </tr>
            </thead>
            <tbody>
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center", padding: "2rem" }}>
                    Aucun candidat n'est parti.
                  </td>
                </tr>
              ) : (
                candidates.map((candidate) => (
                  <tr key={candidate._id}>
                    <td style={{ fontWeight: 600 }}>{candidate.Nom || "-"}</td>
                    <td style={{ fontWeight: 600 }}>
                      {candidate["Prénom"] || "-"}
                    </td>
                    <td>{candidate["Date d'embauche"] || "-"}</td>
                    <td>{candidate.dateDepart || "-"}</td>
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

export default ListeDépart;

