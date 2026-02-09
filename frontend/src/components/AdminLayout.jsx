import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './AdminLayout.css';

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("isAdminLoggedIn");
    navigate("/login");
  };

  return (
    <div className="admin-layout">
      <nav className="navbar">
        <ul className="nav-links">
          <li><Link to="/scan">🚀 Scanner CV</Link></li>
          <li><Link to="/candidates">📋 Candidats</Link></li>
          <li><Link to="/hired">🤝 Embauchés</Link></li>
          <li><Link to="/refused">🚫 Refusés</Link></li>
          <li><Link to="/liste-depart">📋 Liste Départ</Link></li>
        </ul>
        <div className="navbar-right">
          <button className="deconnexion-btn" onClick={handleLogout}>🚪 Déconnexion</button>
        </div>
      </nav>
      <main className="admin-content">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
