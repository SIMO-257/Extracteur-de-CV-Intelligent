import React, { useState } from "react";
import "./styles/CVExtractor.css";

// Use environment variable for API URL (works in Docker)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const CVExtractor = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cvData, setCvData] = useState({
    Nom: "",
    Prénom: "",
    "Date de naissance": "",
    "Adress Actuel": "",
    "Post Actuel": "",
    Société: "",
    "Date d'embauche": "",
    "Salaire net Actuel": "",
    "Votre dernier diplome": "",
    "Votre niveau de l'anglais technique": {
      Lu: "",
      Ecrit: "",
      Parlé: "",
    },
  });
  const [extractionDone, setExtractionDone] = useState(false);
  const [error, setError] = useState(null);
  const [ollamaStatus, setOllamaStatus] = useState(true);

  // Check Ollama status on mount
  React.useEffect(() => {
    checkOllamaHealth();
  }, []);

  const checkOllamaHealth = async () => {
    try {
      const response = await fetch(`${API_URL}/api/cv/health`);
      const data = await response.json();
      setOllamaStatus(data.ollamaRunning);
    } catch (err) {
      console.error("Health check failed:", err);
      setOllamaStatus(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setError(null);
    } else {
      setError("Veuillez sélectionner un fichier PDF");
      setFile(null);
    }
  };

  const handleExtract = async () => {
    if (!file) {
      setError("Veuillez sélectionner un fichier PDF");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("cv", file);

    try {
      const response = await fetch(`${API_URL}/api/cv/extract`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        const generatedLink = `http://localhost:9000/cvs/${result.fileName}`;
        setCvData({ ...result.data, cvLink: generatedLink });
        setExtractionDone(true);
        setError(null);
      } else {
        setError(result.error || "Erreur lors de l'extraction");
      }
    } catch (err) {
      setError(
        "Erreur de connexion au serveur. Assurez-vous que l'API est en cours d'exécution.",
      );
      console.error("Extraction error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    // Extracted fields are read-only as per request
    console.log("Edit ignored: Fields are read-only");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation: Check for empty fields
    const emptyFields = Object.entries(cvData)
      .filter(([key, value]) => {
        if (key === "cvLink") return false;
        if (key === "Votre niveau de l'anglais technique") {
          // For the English object, check if all sub-fields are present
          return (
            !value?.Lu?.trim() || !value?.Ecrit?.trim() || !value?.Parlé?.trim()
          );
        }
        return !value?.trim();
      })
      .map(([key]) => key);

    if (emptyFields.length > 0) {
      setError(
        `Veuillez remplir tous les champs obligatoires (${emptyFields.length} manquants)`,
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/cv/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cvData),
      });

      const result = await response.json();

      if (result.success) {
        alert("✅ Données CV enregistrées avec succès!");
        // Reset form
        setFile(null);
        setExtractionDone(false);
        setCvData({
          Nom: "",
          Prénom: "",
          "Date de naissance": "",
          "Adress Actuel": "",
          "Post Actuel": "",
          Société: "",
          "Date d'embauche": "",
          "Salaire net Actuel": "",
          "Votre dernier diplome": "",
          "Votre niveau de l'anglais technique": "",
        });
      } else {
        setError(result.error || "Erreur lors de l'enregistrement");
      }
    } catch (err) {
      setError("Erreur de connexion au serveur");
      console.error("Save error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setExtractionDone(false);
    setError(null);
    setCvData({
      Nom: "",
      Prénom: "",
      "Date de naissance": "",
      "Adress Actuel": "",
      "Post Actuel": "",
      Société: "",
      "Date d'embauche": "",
      "Salaire net Actuel": "",
      "Votre dernier diplome": "",
      "Votre niveau de l'anglais technique": "",
    });
  };

  const fieldLabels = {
    Nom: "Nom de famille",
    Prénom: "Prénom",
    "Date de naissance": "Date de naissance",
    "Adress Actuel": "Adresse actuelle",
    "Post Actuel": "Poste actuel",
    Société: "Société",
    "Date d'embauche": "Date d'embauche",
    "Salaire net Actuel": "Salaire net actuel",
    "Votre dernier diplome": "Dernier diplôme",
    "Votre niveau de l'anglais technique": "Niveau d'anglais technique",
  };

  const fieldIcons = {
    Nom: "👤",
    Prénom: "👤",
    "Date de naissance": "📅",
    "Adress Actuel": "🏠",
    "Post Actuel": "💼",
    Société: "🏢",
    "Date d'embauche": "📆",
    "Salaire net Actuel": "💰",
    "Votre dernier diplome": "🎓",
    "Votre niveau de l'anglais technique": "🌐",
  };

  /* Form Actions - Add View Candidates button */
  return (
    <div className="cv-extractor-container">
      {/* Add conditional class based on extraction state */}
      <div
        className={`cv-extractor-card ${!extractionDone ? "single-panel" : ""}`}
      >
        {/* Upload Panel - Always shown, but centered when alone */}
        <div className="upload-panel">
          <div className="header">
            <h1>📄 Extracteur de CV Intelligent</h1>
            <p>Extraction automatisée d'informations à partir de CV PDF</p>
            <div style={{ marginTop: "1rem" }}>
              <a
                href="/candidates"
                className="view-list-link"
                style={{
                  color: "rgba(255,255,255,0.9)",
                  textDecoration: "underline",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                📋 Voir la liste des candidats
              </a>
            </div>
            {!ollamaStatus && (
              <div className="warning-banner">
                ⚠️ Ollama n'est pas en cours d'exécution
              </div>
            )}
          </div>

          {error && <div className="error-message">❌ {error}</div>}

          {!extractionDone ? (
            <div className="upload-section">
              <div className="file-upload-wrapper">
                <input
                  type="file"
                  id="cv-file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="file-input"
                />
                <label htmlFor="cv-file" className="file-label">
                  📄 {file ? file.name : "Sélectionner un fichier PDF"}
                </label>
              </div>

              <button
                onClick={handleExtract}
                disabled={!file || loading}
                className="extract-button"
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Extraction en cours...
                  </>
                ) : (
                  <>🔍 Extraire les données</>
                )}
              </button>
            </div>
          ) : null}
        </div>

        {/* Form Panel - Only shown when extraction is done */}
        {extractionDone && (
          <div className="form-panel">
            <form onSubmit={handleSubmit} className="cv-form">
              <div className="form-header">
                <h2>Vérification des données</h2>
                <p className="form-subtitle">
                  Vérifiez et complétez les informations extraites
                </p>
              </div>

              <div className="form-grid">
                {Object.entries(cvData)
                  .filter(([field]) => field !== "cvLink" && fieldLabels[field]) // Filter out technical fields and ensure label exists
                  .map(([field, value]) => (
                    <div key={field} className="form-group">
                      <label htmlFor={field} className="form-label">
                        <span className="field-icon">{fieldIcons[field]}</span>
                        {fieldLabels[field]}
                        {!value && (
                          <span className="required-badge">Requis</span>
                        )}
                      </label>

                      {field === "Votre niveau de l'anglais technique" ? (
                        <ul
                          className="english-skills-preview-list"
                          style={{ listStyle: "none", padding: 0, margin: 0 }}
                        >
                          <li>
                            <strong>Lu:</strong> {value?.Lu || "-"}
                          </li>
                          <li>
                            <strong>Ecrit:</strong> {value?.Ecrit || "-"}
                          </li>
                          <li>
                            <strong>Parlé:</strong> {value?.Parlé || "-"}
                          </li>
                        </ul>
                      ) : (
                        <input
                          type="text"
                          id={field}
                          value={value}
                          readOnly
                          placeholder={fieldLabels[field]}
                          className="form-input filled read-only"
                          style={{
                            backgroundColor: "#f1f1f1",
                            cursor: "not-allowed",
                          }}
                        />
                      )}
                    </div>
                  ))}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={handleReset}
                  className="reset-button"
                  disabled={loading}
                >
                  ↺ Recommencer
                </button>
                <button
                  type="submit"
                  className="submit-button"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Enregistrement...
                    </>
                  ) : (
                    <>💾 Enregistrer</>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default CVExtractor;
