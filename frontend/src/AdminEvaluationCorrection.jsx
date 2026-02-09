import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./styles/EvaluationSystem.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const AdminEvaluationCorrection = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [corrections, setCorrections] = useState({});

  const QUESTIONS = [
    { id: "q1", text: "1. Rôle principal d’un chargé d’étude ?" },
    { id: "q2", text: "2. Erreurs critiques à éviter ?" },
    { id: "q3", text: "3. Comparaison fiche technique / offre fournisseur ?" },
    { id: "q4", text: "4. Inclusion des accessoires ?" },
    { id: "q5", text: "5. Vérifications avant envoi ?" },
    { id: "q6", text: "6. Exemple de non-conformité ?" },
    { id: "q7", text: "7. Risque WhatsApp ?" },
    { id: "q8", text: "8. Frais supplémentaires ?" },
    { id: "q9", text: "9. Conformité normes (ATEX, UL, etc.) ?" },
    { id: "q10", text: "10. Demande incomplète ?" },
    { id: "q11", text: "11. Doute technique ?" },
    { id: "q12", text: "12. Première info à identifier ?" },
    { id: "q13", text: "13. Étape après l'origine ?" },
    { id: "q14", text: "14. Cas UK/UK/ATIS ?" },
    { id: "q15", text: "15. Cas UK/UE/ATIS ?" },
    { id: "q16", text: "16. Cas UK/UE/Eurodistech ?" },
    { id: "q17", text: "17. Cas USA/UE ?" },
    { id: "q18", text: "18. Fournisseur différent du pays d'origine ?" },
    { id: "q19", text: "19. Prévenir RH ?" },
    { id: "q20", text: "20. Horaires officiels ?" },
    { id: "q21", text: "21. Absence urgente ?" },
    { id: "q22", text: "22. Certificat médical refusé ?" },
    { id: "q23", text: "23. Conséquences retard ?" },
    { id: "q24", text: "24. Absence non justifiée ?" },
    { id: "q25", text: "25. Compréhension règles RH ?" },
    { id: "q26", text: "26. Points flous internes ?" },
    { id: "q27", text: "27. Plan anti-malentendu ?" },
    { id: "q28", text: "28. Erreur collègue ?" },
    { id: "q29", text: "29. Tâche secondaire ?" },
    { id: "q30", text: "30. Désaccord chef ?" },
    { id: "q31", text: "31. Perturbation concentration ?" },
    { id: "q32", text: "32. Respect Open Space ?" },
    { id: "q33", text: "33. Difficulté 2 premières semaines ?" },
    { id: "q34", text: "34. Compétences renforcées ?" },
    { id: "q35", text: "35. Produits/Demandes complexes ?" },
    { id: "q36", text: "36. Bonnes pratiques ?" },
    { id: "q37", text: "37. Conseil futur recrue ?" },
    { id: "q38", text: "38. Points d'amélioration ?" },
  ];

  useEffect(() => {
    fetchCandidate();
  }, [id]);

  const fetchCandidate = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cv/${id}`);
      const data = await res.json();
      if (data.success) {
        setCandidate(data.data);
        // Initialize corrections either from existing evalCorrection or with nulls
        const initial = {};
        QUESTIONS.forEach((q) => {
          if (data.data.evalCorrection && q.id in data.data.evalCorrection) {
            initial[q.id] = data.data.evalCorrection[q.id];
          } else {
            initial[q.id] = null;
          }
        });
        setCorrections(initial);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (qId, val) => {
    setCorrections((prev) => ({ ...prev, [qId]: val }));
  };

  const handleSubmitCorrection = async () => {
    const answeredCount = Object.values(corrections).filter(
      (v) => v !== null,
    ).length;
    if (answeredCount < QUESTIONS.length) {
      alert("Veuillez corriger toutes les questions.");
      return;
    }

    setSaving(true);
    try {
      const trueCount = Object.values(corrections).filter(
        (v) => v === true,
      ).length;
      const score = trueCount; // Score is simply the count of true answers

      const res = await fetch(`${API_URL}/api/cv/eval/correct/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evalCorrection: corrections,
          evalScore: score.toFixed(2),
          evalStatus: "corrected",
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Évaluation validée ! Note : ${score}/${QUESTIONS.length}`);
        navigate("/hired");
      }
    } catch (err) {
      alert("Erreur lors de la validation");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Chargement...</div>;
  if (!candidate || !candidate.evalAnswers)
    return <div>Aucune évaluation soumise pour ce candidat.</div>;

  return (
    <div className="correction-container">
      <header className="correction-header">
        <h1>
          ✍️ Correction Évaluation : {candidate.Prenom} {candidate.Nom}
        </h1>
        <p>
          Note actuelle calculée :{" "}
          {Object.values(corrections).filter((v) => v === true).length}/
          {QUESTIONS.length}
        </p>
      </header>

      <div className="correction-list">
        {QUESTIONS.map((q) => (
          <div key={q.id} className="correction-item">
            <div className="q-text">
              <strong>{q.text}</strong>
            </div>
            <div className="ans-text">
              Réponse : {candidate.evalAnswers[q.id] || "N/A"}
            </div>
            <div className="correction-actions">
              <button
                className={`btn-true ${corrections[q.id] === true ? "active" : ""}`}
                onClick={() => handleToggle(q.id, true)}
              >
                ✅ Vrai
              </button>
              <button
                className={`btn-false ${corrections[q.id] === false ? "active" : ""}`}
                onClick={() => handleToggle(q.id, false)}
              >
                ❌ Faux
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="footer-actions">
        <button
          className="validate-btn"
          onClick={handleSubmitCorrection}
          disabled={saving}
        >
          {saving
            ? "Validation..."
            : "Valider la correction et générer la note"}
        </button>
      </div>
    </div>
  );
};

export default AdminEvaluationCorrection;
