import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./styles/RecruitmentForm.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const RecruitmentForm = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [candidateId, setCandidateId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [formData, setFormData] = useState({
    presentezVous: "",
    apporteEtudes: "",
    tempsRechercheEmploi: "",
    qualitesDefauts: "",
    seulOuEquipe: "",
    professionParents: "",
    pretentionsSalariales: "",
    lastExperience: "",
  });

  useEffect(() => {
    if (token) {
      checkAccess();
    } else {
      setChecking(false);
    }
  }, [token]);

  const checkAccess = async () => {
    try {
      const response = await fetch(`${API_URL}/api/cv/token/${token}`);
      const data = await response.json();
      if (data.success && data.data.formStatus === "active") {
        setIsAllowed(true);
        setCandidateId(data.data._id);
      }
    } catch (err) {
      console.error("Access check error:", err);
    } finally {
      setChecking(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = candidateId
        ? `${API_URL}/api/cv/qualified/${candidateId}`
        : `${API_URL}/api/cv/save`; // Fallback or general save

      const method = candidateId ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        alert("Formulaire soumis avec succès !");
        navigate("/candidates");
      } else {
        alert("Erreur: " + data.error);
      }
    } catch (err) {
      console.error("Submission error:", err);
      alert("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div
        className="recruitment-container"
        style={{ display: "flex", justifyContent: "center", padding: "50px" }}
      >
        Chargement...
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="recruitment-container">
        <div
          className="form-card"
          style={{ textAlign: "center", padding: "50px" }}
        >
          <div className="form-header">
            <span style={{ fontSize: "50px" }}>🛡️</span>
            <h1>Accès Restreint</h1>
            <p>
              Ce formulaire n'est pas encore activé ou le lien est invalide.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="recruitment-container">
      <div className="recruitment-card">
        <div className="recruitment-header">
          <h1>Questionnaire de Recrutement</h1>
          <p>Veuillez répondre avec précision aux questions suivantes.</p>
        </div>

        <form className="recruitment-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="presentezVous">1. Présentez-vous ?</label>
              <textarea
                id="presentezVous"
                name="presentezVous"
                value={formData.presentezVous}
                onChange={handleChange}
                placeholder="Décrivez votre parcours..."
                rows="4"
              />
            </div>

            <div className="form-group">
              <label htmlFor="apporteEtudes">
                2. Que vous ont apporté vos études ?
              </label>
              <textarea
                id="apporteEtudes"
                name="apporteEtudes"
                value={formData.apporteEtudes}
                onChange={handleChange}
                placeholder="Compétences, connaissances, expériences..."
                rows="3"
              />
            </div>

            <div className="form-group">
              <label htmlFor="tempsRechercheEmploi">
                3. Depuis combien de temps cherchez-vous un emploi ?
              </label>
              <input
                type="text"
                id="tempsRechercheEmploi"
                name="tempsRechercheEmploi"
                value={formData.tempsRechercheEmploi}
                onChange={handleChange}
                placeholder="Ex: 2 mois, 1 an..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="qualitesDefauts">
                4. Quelles sont vos qualités ? Quels sont vos défauts ?
              </label>
              <textarea
                id="qualitesDefauts"
                name="qualitesDefauts"
                value={formData.qualitesDefauts}
                onChange={handleChange}
                placeholder="Soyez honnête et constructif..."
                rows="3"
              />
            </div>

            <div className="form-group">
              <label htmlFor="seulOuEquipe">
                5. Préférez-vous travailler seul ou en équipe ? Pourquoi ?
              </label>
              <textarea
                id="seulOuEquipe"
                name="seulOuEquipe"
                value={formData.seulOuEquipe}
                onChange={handleChange}
                placeholder="Expliquez vos préférences..."
                rows="3"
              />
            </div>

            <div className="form-group">
              <label htmlFor="professionParents">
                6. Quelle est la profession de vos parents ?
              </label>
              <input
                type="text"
                id="professionParents"
                name="professionParents"
                value={formData.professionParents}
                onChange={handleChange}
                placeholder="Réponse optionnelle"
              />
            </div>

            <div className="form-group">
              <label htmlFor="pretentionsSalariales">
                7. Quelles sont vos prétentions salariales minimales que vous
                pouvez accepter ?
              </label>
              <input
                type="text"
                id="pretentionsSalariales"
                name="pretentionsSalariales"
                value={formData.pretentionsSalariales}
                onChange={handleChange}
                placeholder="Ex: 5000DH / mois"
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastExperience">
                8. Please describe the tasks and responsibilities of your last
                internship or job:
              </label>
              <textarea
                id="lastExperience"
                name="lastExperience"
                value={formData.lastExperience}
                onChange={handleChange}
                placeholder="Summarize your key achievements..."
                rows="4"
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="submit-btn gradient-btn"
              disabled={loading}
            >
              {loading ? "Chargement..." : "Soumettre ma candidature"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecruitmentForm;
