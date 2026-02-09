import React from "react";
import "./styles/CVExtractor.css";

const WelcomePage = () => {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: 0,
      padding: 0,
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      <div style={{
        textAlign: "center",
        color: "white",
        animation: "fadeIn 2s ease-in-out"
      }}>
        <div style={{
          fontSize: "3rem",
          fontWeight: "300",
          marginBottom: "1rem",
          letterSpacing: "2px",
          textShadow: "0 4px 6px rgba(0,0,0,0.1)"
        }}>
          Bienvenue
        </div>
        <div style={{
          fontSize: "1.2rem",
          fontWeight: "200",
          opacity: 0.9,
          letterSpacing: "1px"
        }}>
          Système de Gestion des Candidats
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
