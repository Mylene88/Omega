// frontend/src/pages/Admin/AdminLoginPage.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminLoginPage.css';
import { API_BASE_URL } from '../../config/apiConfig';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Échec de la connexion');
      }

      // Vérifier que l'utilisateur est admin
      const userRole = data.data.user.role?.libelle?.toLowerCase();

      if (userRole !== 'admin' && userRole !== 'administrateur') {
        setError('Accès refusé. Vous devez être administrateur pour accéder à cette page.');
        return;
      }

      // Stocker le token et les infos utilisateur
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      localStorage.setItem('isAdmin', 'true');

      // Rediriger vers l'admin
      navigate('/admin');

    } catch (err) {
      setError(err.message || 'Erreur lors de la connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/login');
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-container">
        <div className="admin-login-header">
          <button onClick={handleBack} className="btn-back-login">
            ← Retour
          </button>
          <div className="admin-login-title">
            <div className="admin-icon">🛡️</div>
            <h1>Administration</h1>
            <p>Authentification administrateur requise</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          {error && (
            <div className="admin-login-error">
              ⚠️ {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Nom d'utilisateur</label>
            <input
              type="text"
              id="username"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              placeholder="Entrez votre nom d'utilisateur"
              required
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              type="password"
              id="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              placeholder="Entrez votre mot de passe"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="btn-submit-admin"
            disabled={isLoading}
          >
            {isLoading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        <div className="admin-login-info">
          <p>⚠️ Accès réservé aux administrateurs uniquement</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
