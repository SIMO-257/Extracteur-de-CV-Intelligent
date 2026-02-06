import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/AdminLogin.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const AdminLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Store simple login flag in localStorage
        localStorage.setItem("isAdminLoggedIn", "true");
        navigate("/candidates");
      } else {
        setError(data.error || "Connexion échouée");
      }
    } catch (err) {
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="admin-icon">🔐</div>
          <h1>Administration</h1>
          <p>Accès réservé au personnel autorisé</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-group">
            <label htmlFor="username">Utilisateur</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nom d'utilisateur"
              required
            />
          </div>

          <div className="login-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? <div className="spinner"></div> : "Se connecter"}
          </button>
        </form>

        <div className="login-footer">
          <p style={{ color: "#a0aec0", fontSize: "12px" }}>
            Plateforme de recrutement interne
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
