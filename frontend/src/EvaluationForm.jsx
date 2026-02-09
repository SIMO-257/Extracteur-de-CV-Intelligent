import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./styles/EvaluationSystem.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const EvaluationForm = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({});
  const [statusMessage, setStatusMessage] = useState("");
  const [manualToken, setManualToken] = useState("");

  useEffect(() => {
    if (token) checkAccess();
    else setChecking(false);
  }, [token]);

  const checkAccess = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cv/eval/token/${token}`);
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.evalStatus === "active") {
          setCandidate(data.data);
        } else if (data.data.evalStatus === "submitted") {
          setStatusMessage(
            "Cette évaluation a déjà été soumise. Aucun nouveau remplissage n'est possible.",
          );
        } else if (data.data.evalStatus === "corrected") {
          setStatusMessage(
            "Cette évaluation a déjà été corrigée. Le lien n'est plus actif.",
          );
        } else {
          setStatusMessage(
            "L'évaluation n'est pas encore activée pour ce candidat.",
          );
        }
      } else {
        setStatusMessage("Lien invalide ou expiré.");
      }
    } catch (err) {
      console.error("Access error:", err);
      setStatusMessage("Erreur de serveur lors de la vérification du lien.");
    } finally {
      setChecking(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/cv/eval/submit/${candidate._id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );
      const data = await res.json();
      if (data.success) setSubmitted(true);
    } catch (_) {
      alert("Erreur lors de la soumission");
    } finally {
      setLoading(false);
    }
  };

  if (checking) return <div className="loading">Chargement...</div>;
  if (!candidate && !token && !statusMessage)
    return (
      <div className="restricted" style={{ maxWidth: "600px", margin: "40px auto", textAlign: "center" }}>
        <h1>Accès à l'évaluation</h1>
        <p>Veuillez saisir le token reçu pour ouvrir votre évaluation.</p>
        <div style={{ display: "flex", gap: "10px", marginTop: "20px", justifyContent: "center" }}>
          <input
            type="text"
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            placeholder="Token d'évaluation"
            style={{ padding: "10px", border: "1px solid #cbd5e0", borderRadius: "6px", minWidth: "280px" }}
          />
          <button
            onClick={() => manualToken && navigate(`/evaluation/${manualToken}`)}
            className="submit-eval-btn"
            disabled={!manualToken}
          >
            Ouvrir
          </button>
        </div>
      </div>
    );
  if (!candidate && statusMessage)
    return <div className="restricted">{statusMessage}</div>;
  if (submitted)
    return (
      <div className="success-container">
        <h1>Merci !</h1>
        <p>Votre évaluation a été bien reçue.</p>
      </div>
    );

  const SECTIONS = [
    {
      title: "Section 1 : Rôle et Préparation de l'Offre",
      questions: [
        {
          id: "q1",
          text: "Peux-tu m’expliquer, avec tes mots, le rôle principal d’un chargé d’étude dans notre entreprise ?",
        },
        {
          id: "q2",
          text: "Quelles sont, selon toi, les erreurs les plus critiques à éviter lorsqu’on prépare une offre client ?",
        },
        {
          id: "q3",
          text: "As-tu déjà eu à comparer une fiche technique client avec une offre fournisseur ? Comment t’y es-tu pris ?",
        },
        {
          id: "q4",
          text: "Comment t’assures-tu que les accessoires demandés sont bien inclus dans l’offre fournisseur ?",
        },
        {
          id: "q5",
          text: "Quelles vérifications fais-tu avant d’envoyer une offre au client ?",
        },
      ],
    },
    {
      title: "Section 2 : Non-conformités et Analyse Technique",
      questions: [
        {
          id: "q6",
          text: "Peux-tu me donner un exemple d’une non-conformité possible liée à une mauvaise interprétation de la demande client ?",
        },
        {
          id: "q7",
          text: "Pourquoi est-il risqué de baser une offre uniquement sur une conversation WhatsApp avec un fournisseur ?",
        },
        {
          id: "q8",
          text: "As-tu identifié des situations où il fallait inclure des frais supplémentaires (formation, douane, etc.) ? Peux-tu me les citer ?",
        },
        {
          id: "q9",
          text: "Quelles précautions prends-tu pour t’assurer que le produit proposé est bien conforme aux normes exigées (FM, ATEX, UL, etc.) ?",
        },
      ],
    },
    {
      title: "Section 3 : Réflexes et Autonomie",
      questions: [
        {
          id: "q10",
          text: "Qu’est-ce que tu fais lorsqu’une demande client est incomplète ou peu claire ?",
        },
        {
          id: "q11",
          text: "Si tu as un doute technique sur une offre, que fais-tu ?",
        },
      ],
    },
    {
      title: "Section 4 : Cas Pratiques (Logistique et Douane)",
      questions: [
        {
          id: "q12",
          text: "Quelle est la première information à identifier ?",
          options: [
            "A. Le prix du produit",
            "B. La plateforme de consultation",
            "C. L’origine du produit",
            "D. Le client final",
          ],
        },
        {
          id: "q13",
          text: "Après l’origine du produit, quelle est l’étape suivante ?",
          options: [
            "A. Vérifier la marge",
            "B. Identifier le pays du fournisseur",
            "C. Envoyer le devis",
            "D. Contacter Mohcine",
          ],
        },
        {
          id: "q14",
          text: "Origine UK, fournisseur UK, consultation via ATIS. Quelle est la décision ?",
          options: [
            "A. Demander le taux à Mohcine",
            "B. Opération exonérée de dédouanement",
            "C. Annuler la commande",
            "D. Changer de plateforme",
          ],
        },
        {
          id: "q15",
          text: "Origine UK, fournisseur UE, consultation via ATIS. Que faut-il faire ?",
          options: [
            "A. Rien, l’opération est exonérée",
            "B. Demander le taux à Mohcine",
            "C. Valider directement le devis",
            "D. Contacter le fournisseur",
          ],
        },
        {
          id: "q16",
          text: "Origine UK, fournisseur UE, consultation via Eurodistech.",
          options: [
            "A. Exonération automatique",
            "B. Demande de taux à Mohcine",
            "C. ATIS obligatoire",
            "D. Refus de la commande",
          ],
        },
        {
          id: "q17",
          text: "Origine USA, fournisseur UE, quelle que soit la plateforme. Que fais-tu ?",
          options: [
            "A. Exonération",
            "B. Demande de taux à Mohcine",
            "C. Validation sans contrôle",
            "D. Attente du client",
          ],
        },
        {
          id: "q18",
          text: "Si le fournisseur est différent du pays d’origine, quelle est la règle à appliquer ?",
          options: [
            "A. Valider si le prix est correct",
            "B. Toujours demander le taux à Mohcine",
            "C. Appliquer une remise",
            "D. Changer d’origine",
          ],
        },
      ],
    },
    {
      title: "Section 5 : Règles Internes et RH",
      questions: [
        {
          id: "q19",
          text: "Peux-tu me citer deux situations où tu dois obligatoirement prévenir ton référent RH ?",
        },
        {
          id: "q20",
          text: "Quels sont les horaires officiels de travail dans l’entreprise (entrée, pause, sortie) ?",
        },
        {
          id: "q21",
          text: "Que dois-tu faire si tu dois t’absenter pour un motif personnel urgent ?",
        },
        {
          id: "q22",
          text: "Que se passe-t-il si ton certificat médical n’est pas validé par le médecin du travail ?",
        },
        {
          id: "q23",
          text: "Quelles sont les conséquences d’un retard à l’entrée le matin ?",
        },
        {
          id: "q24",
          text: "Que se passe-t-il si un salarié s’absente sans justificatif valable ?",
        },
        {
          id: "q25",
          text: "As-tu bien compris l’importance du respect des règles RH ?",
        },
        {
          id: "q26",
          text: "As-tu des points flous ou des questions à poser sur les règles internes ?",
        },
        {
          id: "q27",
          text: "Que comptes-tu mettre en place pour éviter tout malentendu lié aux absences ou retards ?",
        },
      ],
    },
    {
      title: "Section 6 : Comportement et Open Space",
      questions: [
        {
          id: "q28",
          text: "Comment réagissez-vous si un collègue commet une erreur dans son travail ?",
          options: [
            "a) Je l’informe devant tout le monde.",
            "b) Je l’informe en privé et propose mon aide.",
            "c) Je ne dis rien, ce n’est pas mon problème.",
          ],
        },
        {
          id: "q29",
          text: "Un supérieur hiérarchique vous demande une tâche que vous jugez secondaire. Que faites-vous ?",
          options: [
            "a) J’explique calmement mon point de vue et j’exécute la tâche demandée.",
            "b) Je refuse car ce n’est pas prioritaire.",
            "c) J’attends qu’il me le redemande pour le faire.",
          ],
        },
        {
          id: "q30",
          text: "Comment gérez-vous un désaccord avec votre chef de service ?",
          options: [
            "a) Je reste respectueux et expose mes arguments de manière constructive.",
            "b) Je conteste de manière ferme devant l’équipe.",
            "c) J’ignore ses directives si je ne suis pas d’accord.",
          ],
        },
        {
          id: "q31",
          text: "Si un collègue parle trop fort et cela perturbe votre concentration, que faites-vous ?",
          options: [
            "a) Je lui demande poliment de baisser le ton.",
            "b) Je me plains directement au responsable.",
            "c) J’ignore la situation même si cela me gêne.",
          ],
        },
        {
          id: "q32",
          text: "Que signifie pour vous le respect en open space ?",
          options: [
            "a) Respecter le silence de travail",
            "b) Respecter l’espace personnel",
            "c) Les deux à la fois.",
          ],
        },
      ],
    },
    {
      title: "Section 7 : Progression et Engagement",
      questions: [
        {
          id: "q33",
          text: "Qu’est-ce qui t’a paru le plus difficile ces deux premières semaines ?",
        },
        {
          id: "q34",
          text: "Quelles compétences as-tu le plus renforcées depuis ton arrivée ?",
        },
        {
          id: "q35",
          text: "Quels types de produits ou de demandes te semblent encore complexes ? Pourquoi ?",
        },
        {
          id: "q36",
          text: "Quelles bonnes pratiques comptes-tu garder systématiquement dans ta façon de travailler ?",
        },
        {
          id: "q37",
          text: "Quel conseil donnerais-tu à une future recrue qui commence dans le même poste que toi ?",
        },
        {
          id: "q38",
          text: "Sur quel point as-tu envie de t’améliorer dans les prochaines semaines ?",
        },
      ],
    },
  ];

  return (
    <div className="evaluation-container">
      <header className="eval-header">
        <h1>📋 Formulaire d'Évaluation : Chargé d'Étude</h1>
        <p>
          Candidat: {candidate["Prénom"] || ""} {candidate.Nom || ""}
        </p>
      </header>

      <form onSubmit={handleSubmit}>
        {SECTIONS.map((section, idx) => (
          <div key={idx} className="eval-section">
            <h2>{section.title}</h2>
            {section.questions.map((q) => (
              <div key={q.id} className="eval-question">
                <label>{q.text}</label>
                {q.options ? (
                  <div className="options-group">
                    {q.options.map((opt) => (
                      <div key={opt} className="option-item">
                        <input
                          type="radio"
                          id={`${q.id}-${opt}`}
                          name={q.id}
                          value={opt}
                          onChange={handleChange}
                          required
                        />
                        <label htmlFor={`${q.id}-${opt}`}>{opt}</label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <textarea
                    name={q.id}
                    rows="3"
                    onChange={handleChange}
                    placeholder="Votre réponse ici..."
                    required
                  />
                )}
              </div>
            ))}
          </div>
        ))}

        <div className="eval-actions">
          <button type="submit" className="submit-eval-btn" disabled={loading}>
            {loading ? "Envoi..." : "Soumettre l'évaluation"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EvaluationForm;
