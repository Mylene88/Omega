// frontend/src/pages/Admin/AdminPageEnhanced.js
/**
 * Interface d'administration améliorée avec:
 * - Auto-refresh automatique
 * - Confirmations modales pour actions sensibles
 * - Notifications toast en temps réel
 * - Onglet accès admin
 * - Export de données
 * - Métriques avancées
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminPage.css';
import ConfirmationModal from '../../components/admin/ConfirmationModal';
import Toast, { useToast } from '../../components/admin/Toast';
import DeletionRequestsTab from '../../components/admin/DeletionRequestsTab';
import { formatDateTimeFr } from '../../utils/dateFormatter';
import { API_BASE_URL } from '../../config/apiConfig';

const AdminPageEnhanced = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('stats');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // secondes
  const refreshTimerRef = useRef(null);
  const lastRefreshRef = useRef(null);

  // Toast notifications
  const { toasts, addToast, removeToast, success, error: errorToast, warning, info } = useToast();

  // États pour les différentes données
  const [stats, setStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [accessLogs, setAccessLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);

  // Modal de confirmation
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'warning'
  });

  // Filtres
  const [auditFilters, setAuditFilters] = useState({
    limit: 50,
    tableName: '',
    action: '',
    dateFrom: '',
    dateTo: ''
  });

  const [accessFilters, setAccessFilters] = useState({
    limit: 50,
    action: '',
    success: '',
    dateFrom: '',
    dateTo: ''
  });

  const [snapshotFilters, setSnapshotFilters] = useState({
    limit: 50,
    type: ''
  });

  // État pour le formulaire de création d'utilisateur
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: '',
    password: '',
    prenom: '',
    nom: '',
    role_id: ''
  });

  // Vérifier l'authentification admin
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || !user || !user.id_user) {
      navigate('/admin/login', { replace: true });
      return;
    }

    const userRole = user.role?.libelle?.toLowerCase();
    if (userRole !== 'admin' && userRole !== 'administrateur') {
      errorToast('Accès refusé. Droits administrateur requis.', 'Accès refusé');
      navigate('/login', { replace: true });
      return;
    }

    info('Bienvenue dans l\'interface d\'administration', 'Connexion réussie');

    // Charger les rôles disponibles
    fetchRoles();
  }, [navigate, errorToast, info, fetchRoles]);

  // Fonction générique pour les appels API
  const apiCall = useCallback(async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erreur HTTP ${response.status}`);
    }

    return response.json();
  }, []);

  // Charger les statistiques
  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiCall('/admin/stats');
      setStats(data.data);
      lastRefreshRef.current = new Date();
    } catch (err) {
      console.error('Erreur stats:', err);
      setError(err.message);
      errorToast(err.message, 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, errorToast]);

  // Charger l'historique d'audit
  const fetchAuditLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      Object.entries(auditFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const data = await apiCall(`/admin/audit?${params}`);
      setAuditLogs(data.data || []);
      lastRefreshRef.current = new Date();
    } catch (err) {
      console.error('Erreur audit:', err);
      setError(err.message);
      errorToast(err.message, 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, auditFilters, errorToast]);

  // Charger les snapshots
  const fetchSnapshots = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      Object.entries(snapshotFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const data = await apiCall(`/admin/snapshots?${params}`);
      setSnapshots(data.data || []);
      lastRefreshRef.current = new Date();
    } catch (err) {
      console.error('Erreur snapshots:', err);
      setError(err.message);
      errorToast(err.message, 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, snapshotFilters, errorToast]);

  // Charger les logs d'accès admin
  const fetchAccessLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      Object.entries(accessFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const data = await apiCall(`/admin/access-logs?${params}`);
      setAccessLogs(data.data?.logs || []);
      lastRefreshRef.current = new Date();
    } catch (err) {
      console.error('Erreur access logs:', err);
      setError(err.message);
      errorToast(err.message, 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, accessFilters, errorToast]);

  // Charger les utilisateurs
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiCall('/admin/users');
      setUsers(data.data || []);
      lastRefreshRef.current = new Date();
    } catch (err) {
      console.error('Erreur users:', err);
      setError(err.message);
      errorToast(err.message, 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, errorToast]);

  // Charger les rôles disponibles
  const fetchRoles = useCallback(async () => {
    try {
      const data = await apiCall('/service');
      // Note: Adapter l'endpoint selon votre API pour récupérer les rôles
      // Pour l'instant, on peut créer une liste statique ou récupérer depuis une autre route
      setRoles([
        { id_role: 1, libelle: 'Admin' },
        { id_role: 2, libelle: 'Utilisateur' }
      ]);
    } catch (err) {
      console.error('Erreur roles:', err);
    }
  }, [apiCall]);

  // Créer un nouvel utilisateur
  const handleCreateUser = async (e) => {
    e.preventDefault();

    try {
      setIsLoading(true);

      // Validation côté client
      if (!newUserData.username || !newUserData.password) {
        errorToast('Username et mot de passe requis', 'Erreur');
        return;
      }

      if (newUserData.username.length < 3) {
        errorToast('Le username doit contenir au moins 3 caractères', 'Erreur');
        return;
      }

      if (newUserData.password.length < 8) {
        errorToast('Le mot de passe doit contenir au moins 8 caractères', 'Erreur');
        return;
      }

      const response = await apiCall('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          username: newUserData.username,
          password: newUserData.password,
          prenom: newUserData.prenom || null,
          nom: newUserData.nom || null,
          role_id: newUserData.role_id || null
        })
      });

      success('Utilisateur créé avec succès', 'Succès');

      // Réinitialiser le formulaire
      setNewUserData({
        username: '',
        password: '',
        prenom: '',
        nom: '',
        role_id: ''
      });
      setShowCreateUserForm(false);

      // Recharger la liste des utilisateurs
      fetchUsers();

    } catch (err) {
      errorToast(err.message, 'Erreur de création');
    } finally {
      setIsLoading(false);
    }
  };

  // Restaurer un snapshot
  const handleRestoreSnapshot = async (snapshotId, projetId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmer la restauration',
      message: `Êtes-vous sûr de vouloir restaurer le projet à partir de ce snapshot ? Cette action va remplacer toutes les données actuelles du projet ${projetId}.`,
      type: 'warning',
      onConfirm: async () => {
        try {
          await apiCall('/admin/restore', {
            method: 'POST',
            body: JSON.stringify({
              snapshotId,
              createBackup: true
            })
          });

          success('Le projet a été restauré avec succès', 'Restauration réussie');
          fetchSnapshots();
          setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (err) {
          errorToast(err.message, 'Erreur de restauration');
          setConfirmModal({ ...confirmModal, isOpen: false });
        }
      }
    });
  };

  // Export des données
  const handleExportCSV = (data, filename) => {
    try {
      if (!data || data.length === 0) {
        warning('Aucune donnée à exporter', 'Export');
        return;
      }

      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row =>
          headers.map(header => {
            const value = row[header];
            // Échapper les valeurs contenant des virgules ou guillemets
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      success('Export CSV réussi', 'Export');
    } catch (err) {
      errorToast('Erreur lors de l\'export CSV', 'Erreur');
    }
  };

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      return;
    }

    const refreshData = () => {
      switch (activeTab) {
        case 'stats':
          fetchStats();
          break;
        case 'audit':
          fetchAuditLogs();
          break;
        case 'snapshots':
          fetchSnapshots();
          break;
        case 'access':
          fetchAccessLogs();
          break;
        case 'users':
          fetchUsers();
          break;
        default:
          break;
      }
    };

    // Refresh immédiat au changement d'onglet
    refreshData();

    // Setup interval
    refreshTimerRef.current = setInterval(refreshData, refreshInterval * 1000);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, activeTab, fetchStats, fetchAuditLogs, fetchSnapshots, fetchAccessLogs, fetchUsers]);

  // Formater la date (utilise la fonction utilitaire avec gestion timezone correcte)
  const formatDate = formatDateTimeFr;

  // Formater la durée relative
  const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `il y a ${days} jour${days > 1 ? 's' : ''}`;
    if (hours > 0) return `il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
    return `il y a ${seconds} seconde${seconds > 1 ? 's' : ''}`;
  };

  // Rendre l'onglet Utilisateurs
  const renderUsersTab = () => {
    return (
      <div className="users-container">
        <div className="stats-section">
          <div className="section-header">
            <h3>Gestion des utilisateurs</h3>
            <button
              className="btn-export"
              onClick={() => setShowCreateUserForm(!showCreateUserForm)}
            >
              {showCreateUserForm ? 'Annuler' : '+ Créer un utilisateur'}
            </button>
          </div>

          {/* Formulaire de création d'utilisateur */}
          {showCreateUserForm && (
            <div className="create-user-form">
              <form onSubmit={handleCreateUser}>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="username">Username *</label>
                    <input
                      type="text"
                      id="username"
                      value={newUserData.username}
                      onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                      placeholder="Username (min. 3 caractères)"
                      required
                      minLength={3}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="password">Mot de passe *</label>
                    <input
                      type="password"
                      id="password"
                      value={newUserData.password}
                      onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                      placeholder="Mot de passe (min. 8 caractères)"
                      required
                      minLength={8}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="prenom">Prénom</label>
                    <input
                      type="text"
                      id="prenom"
                      value={newUserData.prenom}
                      onChange={(e) => setNewUserData({ ...newUserData, prenom: e.target.value })}
                      placeholder="Prénom"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="nom">Nom</label>
                    <input
                      type="text"
                      id="nom"
                      value={newUserData.nom}
                      onChange={(e) => setNewUserData({ ...newUserData, nom: e.target.value })}
                      placeholder="Nom"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="role_id">Rôle</label>
                    <select
                      id="role_id"
                      value={newUserData.role_id}
                      onChange={(e) => setNewUserData({ ...newUserData, role_id: e.target.value })}
                    >
                      <option value="">Sélectionner un rôle</option>
                      {roles.map(role => (
                        <option key={role.id_role} value={role.id_role}>
                          {role.libelle}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-primary" disabled={isLoading}>
                    {isLoading ? 'Création...' : 'Créer l\'utilisateur'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setShowCreateUserForm(false);
                      setNewUserData({
                        username: '',
                        password: '',
                        prenom: '',
                        nom: '',
                        role_id: ''
                      });
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Liste des utilisateurs */}
          <div className="users-list">
            {users.length > 0 ? (
              <table className="users-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Nom complet</th>
                    <th>Rôle</th>
                    <th>Créé le</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id_user}>
                      <td>{user.id_user}</td>
                      <td>{user.username}</td>
                      <td>{user.nom_complet}</td>
                      <td>
                        <span className="role-badge">{user.role_libelle}</span>
                      </td>
                      <td>{formatDate(user.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">Aucun utilisateur trouvé</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Télécharger les journaux d'audit en CSV
  const downloadAuditCSV = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(auditFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      params.append('format', 'csv');

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/audit/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      success('Journaux d\'audit téléchargés avec succès', 'Export CSV');
    } catch (err) {
      errorToast(err.message, 'Erreur de téléchargement');
    }
  }, [auditFilters, success, errorToast]);

  // Télécharger les logs d'accès admin en CSV
  const downloadAccessLogsCSV = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(accessFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      params.append('format', 'csv');

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/access-logs/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin_access_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      success('Logs d\'accès téléchargés avec succès', 'Export CSV');
    } catch (err) {
      errorToast(err.message, 'Erreur de téléchargement');
    }
  }, [accessFilters, success, errorToast]);

  // Rendre l'onglet Historique d'Audit
  const renderAuditTab = () => {
    return (
      <div className="audit-container">
        <div className="section-header">
          <h3>Historique d'Audit</h3>
          <button className="btn-primary" onClick={downloadAuditCSV}>
            📥 Télécharger CSV
          </button>
        </div>

        {/* Filtres */}
        <div className="filters-panel">
          <div className="filter-group">
            <label>Table</label>
            <input
              type="text"
              placeholder="Nom de la table"
              value={auditFilters.tableName}
              onChange={(e) => setAuditFilters({ ...auditFilters, tableName: e.target.value })}
            />
          </div>

          <div className="filter-group">
            <label>Action</label>
            <select
              value={auditFilters.action}
              onChange={(e) => setAuditFilters({ ...auditFilters, action: e.target.value })}
            >
              <option value="">Toutes</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="RESTORE">RESTORE</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Date début</label>
            <input
              type="date"
              value={auditFilters.dateFrom}
              onChange={(e) => setAuditFilters({ ...auditFilters, dateFrom: e.target.value })}
            />
          </div>

          <div className="filter-group">
            <label>Date fin</label>
            <input
              type="date"
              value={auditFilters.dateTo}
              onChange={(e) => setAuditFilters({ ...auditFilters, dateTo: e.target.value })}
            />
          </div>

          <div className="filter-group">
            <label>Limite</label>
            <input
              type="number"
              value={auditFilters.limit}
              onChange={(e) => setAuditFilters({ ...auditFilters, limit: parseInt(e.target.value) })}
              min="10"
              max="1000"
            />
          </div>

          <button className="btn-secondary" onClick={fetchAuditLogs}>
            🔍 Rechercher
          </button>
        </div>

        {/* Table des logs */}
        <div className="logs-table-container">
          {auditLogs.length > 0 ? (
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Date/Heure</th>
                  <th>Utilisateur</th>
                  <th>Table</th>
                  <th>Enregistrement</th>
                  <th>Action</th>
                  <th>Champs modifiés</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id}>
                    <td>{formatDate(log.createdAt)}</td>
                    <td>{log.user?.nomComplet || 'N/A'}</td>
                    <td>{log.tableName}</td>
                    <td>{log.recordId}</td>
                    <td>
                      <span className={`action-badge action-${log.action.toLowerCase()}`}>
                        {log.action}
                      </span>
                    </td>
                    <td>{log.changedFields?.join(', ') || 'N/A'}</td>
                    <td>{log.userIp || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">Aucun journal d'audit trouvé</div>
          )}
        </div>
      </div>
    );
  };

  // Rendre l'onglet Snapshots
  const renderSnapshotsTab = () => {
    return (
      <div className="snapshots-container">
        <div className="section-header">
          <h3>Snapshots</h3>
        </div>

        <div className="snapshots-info">
          <p>Les snapshots seront affichés ici prochainement.</p>
        </div>
      </div>
    );
  };

  // Rendre l'onglet Accès Admin
  const renderAccessLogsTab = () => {
    return (
      <div className="access-logs-container">
        <div className="section-header">
          <h3>Journaux d'Accès Admin</h3>
          <button className="btn-primary" onClick={downloadAccessLogsCSV}>
            📥 Télécharger CSV
          </button>
        </div>

        {/* Filtres */}
        <div className="filters-panel">
          <div className="filter-group">
            <label>Action</label>
            <input
              type="text"
              placeholder="Action"
              value={accessFilters.action}
              onChange={(e) => setAccessFilters({ ...accessFilters, action: e.target.value })}
            />
          </div>

          <div className="filter-group">
            <label>Succès</label>
            <select
              value={accessFilters.success}
              onChange={(e) => setAccessFilters({ ...accessFilters, success: e.target.value })}
            >
              <option value="">Tous</option>
              <option value="true">Succès</option>
              <option value="false">Échec</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Date début</label>
            <input
              type="date"
              value={accessFilters.dateFrom}
              onChange={(e) => setAccessFilters({ ...accessFilters, dateFrom: e.target.value })}
            />
          </div>

          <div className="filter-group">
            <label>Date fin</label>
            <input
              type="date"
              value={accessFilters.dateTo}
              onChange={(e) => setAccessFilters({ ...accessFilters, dateTo: e.target.value })}
            />
          </div>

          <div className="filter-group">
            <label>Limite</label>
            <input
              type="number"
              value={accessFilters.limit}
              onChange={(e) => setAccessFilters({ ...accessFilters, limit: parseInt(e.target.value) })}
              min="10"
              max="1000"
            />
          </div>

          <button className="btn-secondary" onClick={fetchAccessLogs}>
            🔍 Rechercher
          </button>
        </div>

        {/* Table des logs */}
        <div className="logs-table-container">
          {accessLogs.length > 0 ? (
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Date/Heure</th>
                  <th>Utilisateur</th>
                  <th>Action</th>
                  <th>Ressource</th>
                  <th>Succès</th>
                  <th>Durée (ms)</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {accessLogs.map(log => (
                  <tr key={log.id}>
                    <td>{formatDate(log.createdAt)}</td>
                    <td>{log.user?.fullName || 'N/A'}</td>
                    <td>{log.action}</td>
                    <td>{log.resource || 'N/A'}</td>
                    <td>
                      <span className={`status-badge ${log.success ? 'success' : 'error'}`}>
                        {log.success ? '✓ Succès' : '✗ Échec'}
                      </span>
                    </td>
                    <td>{log.durationMs || 'N/A'}</td>
                    <td>{log.ipAddress || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">Aucun log d'accès trouvé</div>
          )}
        </div>
      </div>
    );
  };

  // Rendre l'onglet Statistiques
  const renderStatsTab = () => {
    if (!stats) return <div className="loading">Chargement...</div>;

    return (
      <div className="stats-container">
        {/* Vue d'ensemble */}
        <div className="stats-section">
          <h3>Vue d'ensemble</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon stat-icon-primary">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.overview?.totalProjets || 0}</div>
                <div className="stat-label">Projets totaux</div>
                {stats.overview?.recentProjets > 0 && (
                  <div className="stat-badge">
                    +{stats.overview.recentProjets} ce mois
                  </div>
                )}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-success">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.overview?.totalUsers || 0}</div>
                <div className="stat-label">Utilisateurs</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-warning">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.overview?.totalSnapshots || 0}</div>
                <div className="stat-label">Snapshots</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon stat-icon-info">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-value">{stats.overview?.totalAuditEntries || 0}</div>
                <div className="stat-label">Entrées d'audit</div>
              </div>
            </div>
          </div>
        </div>

        {/* Activité */}
        <div className="stats-section">
          <div className="section-header">
            <h3>Activité récente</h3>
            <button
              className="btn-export"
              onClick={() => handleExportCSV(stats.activity?.actionCounts || [], 'activite')}
            >
              Exporter CSV
            </button>
          </div>

          {stats.activity?.actionCounts?.length > 0 ? (
            <div className="activity-list">
              {stats.activity.actionCounts.map((action, idx) => (
                <div key={idx} className="activity-item">
                  <div className="activity-icon">
                    {action.action === 'CREATE' && '➕'}
                    {action.action === 'UPDATE' && '✏️'}
                    {action.action === 'DELETE' && '🗑️'}
                    {action.action === 'RESTORE' && '♻️'}
                  </div>
                  <div className="activity-details">
                    <div className="activity-label">{action.action}</div>
                    <div className="activity-count">{action.count} actions</div>
                  </div>
                  <div className="activity-bar">
                    <div
                      className="activity-bar-fill"
                      style={{
                        width: `${(action.count / Math.max(...stats.activity.actionCounts.map(a => a.count))) * 100}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">Aucune activité récente</div>
          )}
        </div>

        {/* Projets par statut */}
        <div className="stats-section">
          <h3>Répartition des projets</h3>
          {stats.projets?.byStatus?.length > 0 ? (
            <div className="status-list">
              {stats.projets.byStatus.map((item, idx) => (
                <div key={idx} className="status-item">
                  <div className="status-label">{item.status}</div>
                  <div className="status-count">{item.count}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">Aucun projet</div>
          )}
        </div>
      </div>
    );
  };

  // Continuer dans la partie 2...
  return (
    <div className="admin-page">
      <Toast toasts={toasts} removeToast={removeToast} />

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />

      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-left">
          <h1>🔒 Administration</h1>
          {lastRefreshRef.current && (
            <span className="last-refresh">
              Dernière mise à jour: {formatRelativeTime(lastRefreshRef.current)}
            </span>
          )}
        </div>

        <div className="admin-header-right">
          {/* Auto-refresh toggle */}
          <div className="auto-refresh-control">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <span>Auto-refresh</span>
            </label>
            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                className="refresh-interval-select"
              >
                <option value={15}>15s</option>
                <option value={30}>30s</option>
                <option value={60}>1min</option>
                <option value={300}>5min</option>
              </select>
            )}
          </div>

          <button
            className="btn-logout"
            onClick={() => {
              localStorage.clear();
              navigate('/login');
              info('Déconnexion réussie', 'Au revoir');
            }}
          >
            Déconnexion
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Statistiques
        </button>
        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Utilisateurs
        </button>
        <button
          className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          📝 Historique d'audit
        </button>
        <button
          className={`tab-btn ${activeTab === 'snapshots' ? 'active' : ''}`}
          onClick={() => setActiveTab('snapshots')}
        >
          💾 Snapshots
        </button>
        <button
          className={`tab-btn ${activeTab === 'access' ? 'active' : ''}`}
          onClick={() => setActiveTab('access')}
        >
          🔑 Accès admin
        </button>
        <button
          className={`tab-btn ${activeTab === 'deletion-requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('deletion-requests')}
        >
          🗑️ Demandes de suppression
        </button>
        <button
          className={`tab-btn ${activeTab === 'archive-requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('archive-requests')}
        >
          🗃️ Demandes d'archivage
        </button>
      </div>

      {/* Content */}
      <div className="admin-content">
        {isLoading && <div className="loading-overlay">Chargement...</div>}
        {error && (
          <div className="error-banner">
            <span>❌ {error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {activeTab === 'stats' && renderStatsTab()}
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'audit' && renderAuditTab()}
        {activeTab === 'snapshots' && renderSnapshotsTab()}
        {activeTab === 'access' && renderAccessLogsTab()}
        {activeTab === 'deletion-requests' && (
          <DeletionRequestsTab
            apiCall={apiCall}
            success={success}
            error={errorToast}
            warning={warning}
          />
        )}
        {activeTab === 'archive-requests' && (
          <DeletionRequestsTab
            mode="archive"
            apiCall={apiCall}
            success={success}
            error={errorToast}
            warning={warning}
          />
        )}
      </div>
    </div>
  );
};

export default AdminPageEnhanced;
