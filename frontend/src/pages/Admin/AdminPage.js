// frontend/src/pages/Admin/AdminPage.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminPage.css';

const AdminPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('stats');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // États pour les différentes données
  const [stats, setStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [filters, setFilters] = useState({
    limit: 100,
    tableName: '',
    action: '',
    dateFrom: '',
    dateTo: ''
  });

  // Vérifier l'authentification admin
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    // TODO: Vérifier réellement si l'utilisateur est admin via le backend
    if (!user || !user.id_user) {
      alert('Accès non autorisé');
      navigate('/');
    }
  }, [navigate]);

  // Charger les données selon l'onglet actif
  useEffect(() => {
    if (activeTab === 'stats') {
      fetchStats();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    } else if (activeTab === 'snapshots') {
      fetchSnapshots();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erreur lors du chargement des statistiques');

      const data = await response.json();
      setStats(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.tableName) params.append('tableName', filters.tableName);
      if (filters.action) params.append('action', filters.action);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const response = await fetch(`http://localhost:3000/api/admin/audit?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erreur lors du chargement de l\'historique');

      const data = await response.json();
      setAuditLogs(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSnapshots = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/admin/snapshots?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erreur lors du chargement des snapshots');

      const data = await response.json();
      setSnapshots(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (snapshotId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir restaurer ce snapshot ? Cette action va écraser l\'état actuel du projet.')) {
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/admin/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          snapshotId,
          createBackup: true
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la restauration');
      }

      alert('✅ Projet restauré avec succès !');
      fetchSnapshots(); // Recharger les snapshots
    } catch (err) {
      alert(`❌ Erreur: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSnapshot = async (idProjet) => {
    const description = window.prompt('Description du snapshot (optionnel):');
    if (description === null) return; // Annulé

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/admin/snapshots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          idProjet,
          description
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la création du snapshot');
      }

      alert('✅ Snapshot créé avec succès !');
      fetchSnapshots(); // Recharger les snapshots
    } catch (err) {
      alert(`❌ Erreur: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionColor = (action) => {
    const colors = {
      CREATE: '#4CAF50',
      UPDATE: '#2196F3',
      DELETE: '#F44336',
      RESTORE: '#FF9800'
    };
    return colors[action] || '#9E9E9E';
  };

  return (
    <div className="admin-page">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-content">
          <h1>🛡️ Administration</h1>
          <button onClick={() => navigate('/')} className="btn-back">
            ← Retour à l'accueil
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Statistiques
        </button>
        <button
          className={`tab ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          📝 Historique d'audit
        </button>
        <button
          className={`tab ${activeTab === 'snapshots' ? 'active' : ''}`}
          onClick={() => setActiveTab('snapshots')}
        >
          📸 Snapshots
        </button>
      </div>

      {/* Content */}
      <div className="admin-content">
        {isLoading && <div className="loading">Chargement...</div>}
        {error && <div className="error-message">❌ {error}</div>}

        {/* Tab: Statistiques */}
        {activeTab === 'stats' && stats && !isLoading && (
          <div className="stats-container">
            <h2>Vue d'ensemble</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{stats.overview.totalProjets}</div>
                <div className="stat-label">Projets totaux</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.overview.totalUsers}</div>
                <div className="stat-label">Utilisateurs</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.overview.totalSnapshots}</div>
                <div className="stat-label">Snapshots</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.overview.totalAuditEntries}</div>
                <div className="stat-label">Entrées d'audit</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.overview.recentProjets}</div>
                <div className="stat-label">Projets (30 derniers jours)</div>
              </div>
            </div>

            <h2>Activité par type d'action</h2>
            <div className="activity-table">
              {stats.activity.actionCounts.map((ac, idx) => (
                <div key={idx} className="activity-row">
                  <span className="activity-action" style={{ backgroundColor: getActionColor(ac.action) }}>
                    {ac.action}
                  </span>
                  <span className="activity-count">{ac.count}</span>
                </div>
              ))}
            </div>

            <h2>Utilisateurs les plus actifs</h2>
            <div className="users-table">
              {stats.activity.activeUsers.map((user, idx) => (
                <div key={idx} className="user-row">
                  <span className="user-name">{user.nomComplet || user.username}</span>
                  <span className="user-count">{user.activityCount} actions</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Historique d'audit */}
        {activeTab === 'audit' && !isLoading && (
          <div className="audit-container">
            <div className="audit-filters">
              <input
                type="text"
                placeholder="Table name..."
                value={filters.tableName}
                onChange={(e) => setFilters({ ...filters, tableName: e.target.value })}
              />
              <select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              >
                <option value="">Toutes les actions</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="RESTORE">RESTORE</option>
              </select>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                placeholder="Date début"
              />
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                placeholder="Date fin"
              />
              <button onClick={fetchAuditLogs} className="btn-filter">Filtrer</button>
            </div>

            <div className="audit-list">
              {auditLogs.map((log) => (
                <div key={log.id} className="audit-item">
                  <div className="audit-header">
                    <span className="audit-action" style={{ backgroundColor: getActionColor(log.action) }}>
                      {log.action}
                    </span>
                    <span className="audit-table">{log.tableName}</span>
                    <span className="audit-record">#{log.recordId}</span>
                    <span className="audit-date">
                      {new Date(log.createdAt).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <div className="audit-details">
                    <div className="audit-user">
                      Par: {log.user ? log.user.nomComplet || log.user.username : 'Système'}
                    </div>
                    {log.changedFields && log.changedFields.length > 0 && (
                      <div className="audit-fields">
                        Champs modifiés: {log.changedFields.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Snapshots */}
        {activeTab === 'snapshots' && !isLoading && (
          <div className="snapshots-container">
            <div className="snapshots-list">
              {snapshots.map((snapshot) => (
                <div key={snapshot.id} className="snapshot-item">
                  <div className="snapshot-header">
                    <span className="snapshot-type">{snapshot.snapshotType}</span>
                    <span className="snapshot-projet">{snapshot.projetNom}</span>
                    <span className="snapshot-id">#{snapshot.id}</span>
                  </div>
                  <div className="snapshot-details">
                    <div className="snapshot-description">
                      {snapshot.description || 'Pas de description'}
                    </div>
                    <div className="snapshot-meta">
                      <span>Créé par: {snapshot.creator ? snapshot.creator.nomComplet : 'Système'}</span>
                      <span>Le: {new Date(snapshot.createdAt).toLocaleString('fr-FR')}</span>
                    </div>
                  </div>
                  <div className="snapshot-actions">
                    <button
                      onClick={() => handleRestore(snapshot.id)}
                      className="btn-restore"
                      disabled={isLoading}
                    >
                      🔄 Restaurer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
