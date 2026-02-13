import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import "./styles/RecruitmentForm.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const RecruitmentForm = () => {
  const { token } = useParams();
  const [candidateId, setCandidateId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [submitted, setSubmitted] = useState(false);
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
      setIsAllowed(true);
      setChecking(false);
    }
  }, [token]);

  const checkAccess = async () => {
    try {
      const response = await fetch(`${API_URL}/api/cv/token/${token}`);
      const data = await response.json();

      if (!data.success) {
        setAccessError(data.error || "Lien invalide");
      } else if (data.data.formStatus === "submitted") {
        setAccessError(
          "Ce formulaire a déjà été soumis et ne peut pas être rempli à nouveau.",
        );
        setIsAllowed(false);
      } else {
        setIsAllowed(true);
        setCandidateId(data.data._id);
      }
    } catch (err) {
      console.error("Access check error:", err);
      setAccessError(
        "Erreur de connexion au serveur lors de la vérification de l'accès.",
      );
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

      let requestBody = formData;
      if (!candidateId) {
        // Only add these fields for new submissions (POST)
        requestBody = {
          ...formData,
          status: "en Attente",
          hiringStatus: "Attente validation client",
          formStatus: "inactive", // Will be updated to 'submitted' on success
          createdAt: new Date(),
        };
      }

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
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
        <div className="recruitment-card" style={{ textAlign: "center" }}>
          <div className="recruitment-header">
            <span style={{ fontSize: "50px" }}>🛡️</span>
            <h1>Accès Restreint</h1>
            <p>
              {accessError ||
                "Ce formulaire n'est pas encore activé ou le lien est invalide."}
            </p>
            <div
              style={{
                marginTop: "20px",
                fontSize: "0.8rem",
                color: "#718096",
                textAlign: "left",
                background: "#f7fafc",
                padding: "15px",
                borderRadius: "8px",
              }}
            >
              <strong>Debug Info:</strong>
              <div style={{ marginTop: "5px" }}>
                Token: <code>{token || "aucun"}</code>
              </div>
              <div>
                API URL: <code>{API_URL}</code>
              </div>
              <div>
                Full URL: <code>{`${API_URL}/api/cv/token/${token}`}</code>
              </div>
              <button
                onClick={() => window.location.reload()}
                style={{
                  marginTop: "10px",
                  background: "#3182ce",
                  color: "white",
                  border: "none",
                  padding: "5px 10px",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                🔄 Actualiser la page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="recruitment-container">
        <div className="recruitment-card" style={{ textAlign: "center" }}>
          <div className="recruitment-header">
            <span style={{ fontSize: "60px" }}>🎉</span>
            <h1>Merci !</h1>
            <p>Votre candidature a été soumise avec succès.</p>
            <p style={{ marginTop: "20px", color: "#718096" }}>
              Notre équipe va étudier vos réponses et reviendra vers vous
              prochainement.
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
