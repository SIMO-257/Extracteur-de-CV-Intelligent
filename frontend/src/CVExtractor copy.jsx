import React, { useState } from 'react';
import './CVExtractor.css';

// Use environment variable for API URL (works in Docker)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CVExtractor = () => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [cvData, setCvData] = useState({
        "Nom": "",
        "Prénom": "",
        "Date de naissance": "",
        "Adress Actuel": "",
        "Post Actuel": "",
        "Société": "",
        "Date d'embauche": "",
        "Salaire net Actuel": "",
        "Votre dernier diplome": "",
        "Votre niveau de l'anglais technique": ""
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
            console.error('Health check failed:', err);
            setOllamaStatus(false);
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type === 'application/pdf') {
            setFile(selectedFile);
            setError(null);
        } else {
            setError('Veuillez sélectionner un fichier PDF');
            setFile(null);
        }
    };

    const handleExtract = async () => {
        if (!file) {
            setError('Veuillez sélectionner un fichier PDF');
            return;
        }

        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('cv', file);

        try {
            const response = await fetch(`${API_URL}/api/cv/extract`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {

                setCvData(result.data);
                setExtractionDone(true);
                setError(null);

            } else {
                setError(result.error || 'Erreur lors de l\'extraction');
            }
        } catch (err) {
            setError('Erreur de connexion au serveur. Assurez-vous que l\'API est en cours d\'exécution.');
            console.error('Extraction error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setCvData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/cv/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(cvData)
            });

            const result = await response.json();

            if (result.success) {
                alert('✅ Données CV enregistrées avec succès!');
                // Reset form
                setFile(null);
                setExtractionDone(false);
                setCvData({
                    "Nom": "",
                    "Prénom": "",
                    "Date de naissance": "",
                    "Adress Actuel": "",
                    "Post Actuel": "",
                    "Société": "",
                    "Date d'embauche": "",
                    "Salaire net Actuel": "",
                    "Votre dernier diplome": "",
                    "Votre niveau de l'anglais technique": ""
                });
            } else {
                setError(result.error || 'Erreur lors de l\'enregistrement');
            }
        } catch (err) {
            setError('Erreur de connexion au serveur');
            console.error('Save error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setExtractionDone(false);
        setError(null);
        setCvData({
            "Nom": "",
            "Prénom": "",
            "Date de naissance": "",
            "Adress Actuel": "",
            "Post Actuel": "",
            "Société": "",
            "Date d'embauche": "",
            "Salaire net Actuel": "",
            "Votre dernier diplome": "",
            "Votre niveau de l'anglais technique": ""
        });
    };

    const fieldLabels = {
        "Nom": "Nom de famille",
        "Prénom": "Prénom",
        "Date de naissance": "Date de naissance",
        "Adress Actuel": "Adresse actuelle",
        "Post Actuel": "Poste actuel",
        "Société": "Société",
        "Date d'embauche": "Date d'embauche",
        "Salaire net Actuel": "Salaire net actuel",
        "Votre dernier diplome": "Dernier diplôme",
        "Votre niveau de l'anglais technique": "Niveau d'anglais technique"
    };

    const fieldIcons = {
        "Nom": "👤",
        "Prénom": "👤",
        "Date de naissance": "📅",
        "Adress Actuel": "🏠",
        "Post Actuel": "💼",
        "Société": "🏢",
        "Date d'embauche": "📆",
        "Salaire net Actuel": "💰",
        "Votre dernier diplome": "🎓",
        "Votre niveau de l'anglais technique": "🌐"
    };

    return (
        <div className="cv-extractor-container">
            <div className={`cv-extractor-card ${!extractionDone ? 'single-panel' : ''}`}>
                <div className="header">
                    <h1>🤖 Extracteur de CV Intelligent</h1>
                    <p>Téléchargez votre CV et laissez l'IA extraire les informations</p>
                    {!ollamaStatus && (
                        <div className="warning-banner">
                            ⚠️ Ollama n'est pas en cours d'exécution. Vérifiez votre configuration Docker.
                        </div>
                    )}
                </div>

                {error && (
                    <div className="error-message">
                        ❌ {error}
                    </div>
                )}

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
                                📄 {file ? file.name : 'Choisir un fichier PDF'}
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
                                <>
                                    🚀 Extraire les informations
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="cv-form">
                        <div className="form-header">
                            <h2>📝 Vérifiez et complétez les informations</h2>
                            <p className="form-subtitle">
                                Les champs extraits automatiquement sont remplis. 
                                Complétez ou corrigez les informations si nécessaire.
                            </p>
                        </div>

                        <div className="form-grid">
                            {Object.entries(cvData).map(([field, value]) => (
                                <div key={field} className="form-group">
                                    <label htmlFor={field} className="form-label">
                                        <span className="field-icon">{fieldIcons[field]}</span>
                                        {fieldLabels[field]}
                                        {!value && <span className="required-badge">À remplir</span>}
                                    </label>
                                    
                                    {field === "Votre niveau de l'anglais technique" ? (
                                        <select
                                            id={field}
                                            value={value}
                                            onChange={(e) => handleInputChange(field, e.target.value)}
                                            className={`form-input ${!value ? 'empty' : 'filled'}`}
                                        >
                                            <option value="">Sélectionner...</option>
                                            <option value="Bien">Bien</option>
                                            <option value="Moyen">Moyen</option>
                                            <option value="Faible">Faible</option>
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            id={field}
                                            value={value}
                                            onChange={(e) => handleInputChange(field, e.target.value)}
                                            placeholder={`Entrez ${fieldLabels[field].toLowerCase()}`}
                                            className={`form-input ${!value ? 'empty' : 'filled'}`}
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
                                🔄 Recommencer
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
                                    <>
                                        💾 Enregistrer
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default CVExtractor;