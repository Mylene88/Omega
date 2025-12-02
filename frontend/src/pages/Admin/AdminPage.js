// frontend/src/pages/Admin/AdminPage.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminPage.css';
import DeletionRequestsTab from '../../components/admin/DeletionRequestsTab';
import SectionVersionsTab from '../../components/admin/SectionVersionsTab';
import { formatDateTimeFr } from '../../utils/dateFormatter';

const AdminPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('stats');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // États pour les différentes données
  const [stats, setStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [filters, setFilters] = useState({
    limit: 100,
    tableName: '',
    action: '',
    dateFrom: '',
    dateTo: ''
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

  // État pour la sélection des utilisateurs à supprimer
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // État pour la modification d'un utilisateur
  const [editingUser, setEditingUser] = useState(null);
  const [editUserData, setEditUserData] = useState({
    username: '',
    password: '',
    prenom: '',
    nom: '',
    role_id: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);

  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Vérifier l'authentification admin
  useEffect(() => {
    console.log('🚀 [ADMIN] Initialisation de la page Admin');
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    console.log('🔐 [ADMIN] Vérification de l\'authentification');
    console.log('👤 [ADMIN] User:', {
      id: user.id_user,
      role: user.role?.libelle,
      username: user.username
    });

    // Vérifier que l'utilisateur est connecté
    if (!token || !user || !user.id_user) {
      console.warn('⚠️  [ADMIN] Utilisateur non connecté, redirection vers /admin/login');
      navigate('/admin/login', { replace: true });
      return;
    }

    // Vérifier que l'utilisateur est admin
    const userRole = user.role?.libelle?.toLowerCase();
    if (userRole !== 'admin' && userRole !== 'administrateur') {
      console.error('❌ [ADMIN] Accès refusé - rôle insuffisant:', userRole);
      alert('❌ Accès refusé. Seuls les administrateurs peuvent accéder à cette page.');
      navigate('/login', { replace: true });
      return;
    }

    console.log('✅ [ADMIN] Authentification validée');
  }, [navigate]);

  // Charger les données selon l'onglet actif
  useEffect(() => {
    console.log('🔄 [ADMIN] Changement d\'onglet:', activeTab);

    if (activeTab === 'stats') {
      fetchStats();
    } else if (activeTab === 'audit') {
      fetchAuditLogs();
    } else if (activeTab === 'snapshots') {
      fetchSnapshots();
    } else if (activeTab === 'users') {
      fetchUsers();
      fetchRoles();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    console.log('📊 [ADMIN] Début du chargement des statistiques');
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      console.log('📤 [ADMIN] Requête GET stats');

      const response = await fetch('http://localhost:3000/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📥 [ADMIN] Réponse reçue, status:', response.status);

      if (!response.ok) throw new Error('Erreur lors du chargement des statistiques');

      const data = await response.json();
      console.log('📋 [ADMIN] Statistiques reçues:', data.data);

      setStats(data.data);
      console.log('✅ [ADMIN] Statistiques chargées avec succès');
    } catch (err) {
      console.error('❌ [ADMIN] Erreur lors du chargement des statistiques:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    console.log('📝 [ADMIN] Début du chargement des logs d\'audit');
    console.log('🔍 [ADMIN] Filtres appliqués:', filters);

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

      const queryString = params.toString();
      console.log('📤 [ADMIN] Requête GET audit avec params:', queryString);

      const response = await fetch(`http://localhost:3000/api/admin/audit?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📥 [ADMIN] Réponse reçue, status:', response.status);

      if (!response.ok) throw new Error('Erreur lors du chargement de l\'historique');

      const data = await response.json();
      console.log('📋 [ADMIN] Nombre de logs d\'audit reçus:', data.data?.length || 0);
      console.log('📊 [ADMIN] Logs d\'audit:', data.data);

      setAuditLogs(data.data);
      console.log('✅ [ADMIN] Logs d\'audit chargés avec succès');
    } catch (err) {
      console.error('❌ [ADMIN] Erreur lors du chargement des logs d\'audit:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSnapshots = async () => {
    console.log('📸 [ADMIN] Début du chargement des snapshots');
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      console.log('📤 [ADMIN] Requête GET snapshots avec limit=100');

      const response = await fetch('http://localhost:3000/api/admin/snapshots?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📥 [ADMIN] Réponse reçue, status:', response.status);

      if (!response.ok) throw new Error('Erreur lors du chargement des snapshots');

      const data = await response.json();
      console.log('📋 [ADMIN] Nombre de snapshots reçus:', data.data?.length || 0);
      console.log('📊 [ADMIN] Snapshots:', data.data);

      setSnapshots(data.data);
      console.log('✅ [ADMIN] Snapshots chargés avec succès');
    } catch (err) {
      console.error('❌ [ADMIN] Erreur lors du chargement des snapshots:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    console.log('👥 [ADMIN] Début du chargement des utilisateurs');
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📥 [ADMIN] Réponse reçue, status:', response.status);

      if (!response.ok) throw new Error('Erreur lors du chargement des utilisateurs');

      const data = await response.json();
      console.log('📋 [ADMIN] Utilisateurs reçus:', data.data);

      setUsers(data.data || []);
      console.log('✅ [ADMIN] Utilisateurs chargés avec succès');
    } catch (err) {
      console.error('❌ [ADMIN] Erreur lors du chargement des utilisateurs:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    console.log('🎭 [ADMIN] Chargement des rôles disponibles');
    try {
      // Pour l'instant, utiliser des rôles statiques
      // Vous pouvez créer un endpoint API pour récupérer les rôles depuis la base de données
      setRoles([
        { id_role: 1, libelle: 'Admin' },
        { id_role: 2, libelle: 'Utilisateur' }
      ]);
      console.log('✅ [ADMIN] Rôles chargés');
    } catch (err) {
      console.error('❌ [ADMIN] Erreur lors du chargement des rôles:', err);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    console.log('➕ [ADMIN] Début de création d\'utilisateur');
    console.log('📝 [ADMIN] Données:', newUserData);

    try {
      setIsLoading(true);

      // Validation côté client
      if (!newUserData.username || !newUserData.password) {
        alert('❌ Username et mot de passe requis');
        return;
      }

      if (newUserData.username.length < 3) {
        alert('❌ Le username doit contenir au moins 3 caractères');
        return;
      }

      if (newUserData.password.length < 8) {
        alert('❌ Le mot de passe doit contenir au moins 8 caractères');
        return;
      }

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: newUserData.username,
          password: newUserData.password,
          prenom: newUserData.prenom || null,
          nom: newUserData.nom || null,
          role_id: newUserData.role_id || null
        })
      });

      console.log('📥 [ADMIN] Réponse reçue, status:', response.status);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la création de l\'utilisateur');
      }

      console.log('✅ [ADMIN] Utilisateur créé avec succès!');
      alert('✅ Utilisateur créé avec succès !');

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
      console.error('❌ [ADMIN] Erreur lors de la création:', err);
      alert(`❌ Erreur: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Gérer la sélection de tous les utilisateurs
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const currentUserId = JSON.parse(localStorage.getItem('user') || '{}').id_user;
      const selectableUsers = users.filter(u => u.id_user !== currentUserId).map(u => u.id_user);
      setSelectedUserIds(selectableUsers);
    } else {
      setSelectedUserIds([]);
    }
  };

  // Gérer la sélection d'un utilisateur
  const handleSelectUser = (userId) => {
    setSelectedUserIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // Supprimer les utilisateurs sélectionnés
  const handleDeleteUsers = async (userIdsToDelete = null) => {
    const idsToDelete = userIdsToDelete || selectedUserIds;

    if (!idsToDelete || idsToDelete.length === 0) {
      alert('❌ Veuillez sélectionner au moins un utilisateur à supprimer');
      return;
    }

    const confirmMessage = `Êtes-vous sûr de vouloir supprimer ${idsToDelete.length} utilisateur(s) ?\n\nCette action est irréversible.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    console.log('🗑️ [ADMIN] Début de suppression des utilisateurs');
    console.log('📝 [ADMIN] IDs:', idsToDelete);

    try {
      setIsLoading(true);

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userIds: idsToDelete
        })
      });

      console.log('📥 [ADMIN] Réponse reçue, status:', response.status);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la suppression des utilisateurs');
      }

      console.log('✅ [ADMIN] Utilisateurs supprimés avec succès!');
      alert(`✅ ${data.data.deletedCount} utilisateur(s) supprimé(s) avec succès !`);

      // Réinitialiser la sélection
      setSelectedUserIds([]);

      // Recharger la liste des utilisateurs
      fetchUsers();

    } catch (err) {
      console.error('❌ [ADMIN] Erreur lors de la suppression:', err);
      alert(`❌ Erreur: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Ouvrir le formulaire de modification
  const handleOpenEditUser = (user) => {
    setEditingUser(user);
    setEditUserData({
      username: user.username,
      password: '', // Laisser vide, sera rempli seulement si changement
      prenom: user.prenom || '',
      nom: user.nom || '',
      role_id: user.role_id || ''
    });
    setShowCreateUserForm(false); // Fermer le formulaire de création si ouvert
  };

  // Modifier un utilisateur
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    console.log('✏️ [ADMIN] Début de modification d\'utilisateur');
    console.log('📝 [ADMIN] Données:', editUserData);

    try {
      setIsLoading(true);

      // Validation côté client
      if (editUserData.password && editUserData.password.length < 8) {
        alert('❌ Le mot de passe doit contenir au moins 8 caractères');
        return;
      }

      const token = localStorage.getItem('token');
      const updateData = {
        prenom: editUserData.prenom || null,
        nom: editUserData.nom || null,
        role_id: editUserData.role_id || null
      };

      // Ajouter le mot de passe seulement s'il a été renseigné
      if (editUserData.password) {
        updateData.password = editUserData.password;
        updateData.first_login = true; // Forcer le changement de mot de passe à la prochaine connexion
      }

      const response = await fetch(`http://localhost:3000/api/admin/users/${editingUser.id_user}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      console.log('📥 [ADMIN] Réponse reçue, status:', response.status);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la modification de l\'utilisateur');
      }

      console.log('✅ [ADMIN] Utilisateur modifié avec succès!');

      let successMessage = '✅ Utilisateur modifié avec succès !';
      if (editUserData.password) {
        successMessage += '\n\n⚠️ Un mot de passe provisoire a été défini. L\'utilisateur devra le changer à sa prochaine connexion.';
      }
      alert(successMessage);

      // Réinitialiser le formulaire
      setEditingUser(null);
      setEditUserData({
        username: '',
        password: '',
        prenom: '',
        nom: '',
        role_id: ''
      });

      // Recharger la liste des utilisateurs
      fetchUsers();

    } catch (err) {
      console.error('❌ [ADMIN] Erreur lors de la modification:', err);
      alert(`❌ Erreur: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (snapshotId) => {
    console.log('🔄 [ADMIN] Début de la restauration');
    console.log('📸 [ADMIN] Snapshot ID:', snapshotId);

    if (!window.confirm('Êtes-vous sûr de vouloir restaurer ce snapshot ? Cette action va écraser l\'état actuel du projet.')) {
      console.log('❌ [ADMIN] Restauration annulée par l\'utilisateur');
      return;
    }

    setIsLoading(true);
    console.log('⏳ [ADMIN] Envoi de la requête de restauration...');

    try {
      const token = localStorage.getItem('token');
      const requestBody = {
        snapshotId,
        createBackup: true
      };

      console.log('📤 [ADMIN] Body de la requête:', requestBody);

      const response = await fetch('http://localhost:3000/api/admin/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 [ADMIN] Réponse reçue, status:', response.status);

      const data = await response.json();
      console.log('📋 [ADMIN] Données de la réponse:', data);

      if (!response.ok) {
        console.error('❌ [ADMIN] Erreur dans la réponse:', data);
        throw new Error(data.message || 'Erreur lors de la restauration');
      }

      console.log('✅ [ADMIN] Restauration réussie!');
      console.log('📊 [ADMIN] Détails:', {
        idProjet: data.data?.idProjet,
        snapshotId: data.data?.snapshotId,
        restoredAt: data.data?.restoredAt
      });

      alert(`✅ Projet restauré avec succès !\n\n⚠️ IMPORTANT : Pour voir les changements, vous devez :\n1. Actualiser la page de visualisation (F5)\n2. Ou fermer et rouvrir le projet dans la vue liste\n\nLes modifications ont bien été appliquées en base de données.`);

      console.log('🔄 [ADMIN] Rechargement de la liste des snapshots...');
      fetchSnapshots(); // Recharger les snapshots
    } catch (err) {
      console.error('💥 [ADMIN] Erreur lors de la restauration:', err);
      console.error('📍 [ADMIN] Stack trace:', err.stack);
      alert(`❌ Erreur: ${err.message}`);
    } finally {
      setIsLoading(false);
      console.log('🏁 [ADMIN] Fin du processus de restauration');
    }
  };

  const handleCreateSnapshot = async (idProjet) => {
    console.log('📸 [ADMIN] Début de création manuelle de snapshot');
    console.log('🆔 [ADMIN] ID Projet:', idProjet);

    const description = window.prompt('Description du snapshot (optionnel):');
    if (description === null) {
      console.log('❌ [ADMIN] Création de snapshot annulée par l\'utilisateur');
      return; // Annulé
    }

    console.log('📝 [ADMIN] Description:', description || '(vide)');

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const requestBody = {
        idProjet,
        description
      };

      console.log('📤 [ADMIN] Body de la requête:', requestBody);

      const response = await fetch('http://localhost:3000/api/admin/snapshots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 [ADMIN] Réponse reçue, status:', response.status);

      const data = await response.json();
      console.log('📋 [ADMIN] Données de la réponse:', data);

      if (!response.ok) {
        console.error('❌ [ADMIN] Erreur dans la réponse:', data);
        throw new Error(data.message || 'Erreur lors de la création du snapshot');
      }

      console.log('✅ [ADMIN] Snapshot créé avec succès!');
      console.log('📊 [ADMIN] Détails du nouveau snapshot:', data.data);

      alert('✅ Snapshot créé avec succès !');

      console.log('🔄 [ADMIN] Rechargement de la liste des snapshots...');
      fetchSnapshots(); // Recharger les snapshots
    } catch (err) {
      console.error('💥 [ADMIN] Erreur lors de la création du snapshot:', err);
      console.error('📍 [ADMIN] Stack trace:', err.stack);
      alert(`❌ Erreur: ${err.message}`);
    } finally {
      setIsLoading(false);
      console.log('🏁 [ADMIN] Fin du processus de création de snapshot');
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
              className={`tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
          >
            👥 Utilisateurs
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
          <button
              className={`tab ${activeTab === 'deletion-requests' ? 'active' : ''}`}
              onClick={() => setActiveTab('deletion-requests')}
          >
            🗑️ Demandes de suppression
          </button>
          <button
              className={`tab ${activeTab === 'section-versions' ? 'active' : ''}`}
              onClick={() => setActiveTab('section-versions')}
          >
            🔄 Versions de Sections
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

          {/* Tab: Utilisateurs */}
          {activeTab === 'users' && !isLoading && (
              <div className="users-container">
                <div className="stats-section">
                  <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2>Gestion des utilisateurs</h2>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      {selectedUserIds.length > 0 && (
                          <button
                              className="btn-restore"
                              onClick={handleDeleteUsers}
                              style={{ background: '#c89090' }}
                          >
                            🗑️ Supprimer ({selectedUserIds.length})
                          </button>
                      )}
                      <button
                          className="btn-filter"
                          onClick={() => {
                            setShowCreateUserForm(!showCreateUserForm);
                            setEditingUser(null); // Fermer le formulaire d'édition
                          }}
                      >
                        {showCreateUserForm ? 'Annuler' : '+ Créer un utilisateur'}
                      </button>
                    </div>
                  </div>

                  {/* Modal de modification d'utilisateur */}
                  {editingUser && (
                      <div className="modal-overlay" onClick={() => {
                        setEditingUser(null);
                        setShowPassword(false);
                      }}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', background: '#fff4e6', borderLeft: '4px solid #d4a574' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, color: '#d4a574' }}>✏️ Modifier l'utilisateur: {editingUser.username}</h3>
                            <button
                                onClick={() => {
                                  setEditingUser(null);
                                  setShowPassword(false);
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  fontSize: '1.5rem',
                                  cursor: 'pointer',
                                  color: '#78716c'
                                }}
                            >
                              ×
                            </button>
                          </div>
                          <form onSubmit={handleUpdateUser}>
                            <div className="form-grid">
                              <div className="form-group">
                                <label htmlFor="edit-username">Username</label>
                                <input
                                    type="text"
                                    id="edit-username"
                                    value={editUserData.username}
                                    disabled
                                    style={{ background: '#f5f5f4', cursor: 'not-allowed' }}
                                />
                                <small style={{ color: '#78716c', fontSize: '0.8rem' }}>Le username ne peut pas être modifié</small>
                              </div>

                              <div className="form-group">
                                <label htmlFor="edit-password">Nouveau mot de passe (optionnel)</label>
                                <div style={{ position: 'relative' }}>
                                  <input
                                      type={showPassword ? "text" : "password"}
                                      id="edit-password"
                                      value={editUserData.password}
                                      onChange={(e) => setEditUserData({ ...editUserData, password: e.target.value })}
                                      placeholder="Laisser vide pour ne pas changer"
                                      minLength={8}
                                      style={{ paddingRight: '2.5rem' }}
                                  />
                                  {editUserData.password && (
                                      <button
                                          type="button"
                                          onClick={() => setShowPassword(!showPassword)}
                                          style={{
                                            position: 'absolute',
                                            right: '0.5rem',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '1.2rem'
                                          }}
                                      >
                                        {showPassword ? '👁️' : '👁️‍🗨️'}
                                      </button>
                                  )}
                                </div>
                                <small style={{ color: '#78716c', fontSize: '0.8rem' }}>
                                  Si changé, sera défini comme mot de passe provisoire (min. 8 car.)
                                </small>
                              </div>

                              <div className="form-group">
                                <label htmlFor="edit-prenom">Prénom</label>
                                <input
                                    type="text"
                                    id="edit-prenom"
                                    value={editUserData.prenom}
                                    onChange={(e) => setEditUserData({ ...editUserData, prenom: e.target.value })}
                                    placeholder="Prénom"
                                />
                              </div>

                              <div className="form-group">
                                <label htmlFor="edit-nom">Nom</label>
                                <input
                                    type="text"
                                    id="edit-nom"
                                    value={editUserData.nom}
                                    onChange={(e) => setEditUserData({ ...editUserData, nom: e.target.value })}
                                    placeholder="Nom"
                                />
                              </div>

                              <div className="form-group">
                                <label htmlFor="edit-role_id">Rôle</label>
                                <select
                                    id="edit-role_id"
                                    value={editUserData.role_id}
                                    onChange={(e) => setEditUserData({ ...editUserData, role_id: e.target.value })}
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
                                {isLoading ? 'Modification...' : 'Enregistrer les modifications'}
                              </button>
                              <button
                                  type="button"
                                  className="btn-secondary"
                                  onClick={() => {
                                    setEditingUser(null);
                                    setShowPassword(false);
                                    setEditUserData({
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
                      </div>
                  )}

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
                              <div style={{ position: 'relative' }}>
                                <input
                                    type={showNewUserPassword ? "text" : "password"}
                                    id="password"
                                    value={newUserData.password}
                                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                                    placeholder="Mot de passe (min. 8 caractères)"
                                    required
                                    minLength={8}
                                    style={{ paddingRight: '2.5rem' }}
                                />
                                {newUserData.password && (
                                    <button
                                        type="button"
                                        onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                                        style={{
                                          position: 'absolute',
                                          right: '0.5rem',
                                          top: '50%',
                                          transform: 'translateY(-50%)',
                                          background: 'transparent',
                                          border: 'none',
                                          cursor: 'pointer',
                                          fontSize: '1.2rem'
                                        }}
                                    >
                                      {showNewUserPassword ? '👁️' : '👁️‍🗨️'}
                                    </button>
                                )}
                              </div>
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
                        <>
                          {/* Contrôles de pagination */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1rem',
                            padding: '1rem',
                            background: 'white',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                Afficher:
                              </span>
                              <select
                                  value={itemsPerPage}
                                  onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1); // Retour à la première page
                                  }}
                                  style={{
                                    padding: '0.5rem',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color)',
                                    fontSize: '0.9rem'
                                  }}
                              >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={150}>150</option>
                                <option value={users.length}>Tous ({users.length})</option>
                              </select>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                éléments par page
                              </span>
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                              {users.length === 0 ? 'Aucun' : `${((currentPage - 1) * itemsPerPage) + 1}-${Math.min(currentPage * itemsPerPage, users.length)}`} sur {users.length} utilisateur(s)
                            </div>
                          </div>

                          {/* Table avec scroll horizontal */}
                          <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                            <table className="users-table">
                              <thead>
                              <tr>
                                <th className="th-checkbox">
                                  <input
                                      type="checkbox"
                                      onChange={handleSelectAll}
                                      checked={selectedUserIds.length > 0 && selectedUserIds.length === users.filter(u => u.id_user !== JSON.parse(localStorage.getItem('user') || '{}').id_user).length}
                                  />
                                </th>
                                <th className="th-id">ID</th>
                                <th className="th-username">Username</th>
                                <th className="th-nom">Nom complet</th>
                                <th className="th-role">Rôle</th>
                                <th className="th-date">Créé le</th>
                                <th className="th-actions">Actions</th>
                              </tr>
                              </thead>
                              <tbody>
                              {users
                                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                  .map(user => {
                                    const currentUserId = JSON.parse(localStorage.getItem('user') || '{}').id_user;
                                    const isCurrentUser = user.id_user === currentUserId;

                                    return (
                                        <tr key={user.id_user} style={{ opacity: isCurrentUser ? 0.6 : 1 }}>
                                          <td className="td-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={selectedUserIds.includes(user.id_user)}
                                                onChange={() => handleSelectUser(user.id_user)}
                                                disabled={isCurrentUser}
                                            />
                                          </td>
                                          <td className="td-id">{user.id_user}</td>
                                          <td className="td-username">
                                            {user.username}
                                            {isCurrentUser && <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#6b7280' }}>(Vous)</span>}
                                          </td>
                                          <td className="td-nom">{user.nom_complet}</td>
                                          <td className="td-role">
                                            <span className="role-badge">{user.role_libelle}</span>
                                          </td>
                                          <td className="td-date">{formatDateTimeFr(user.created_at)}</td>
                                          <td className="td-actions">
                                            <button
                                                className="btn-filter"
                                                onClick={() => handleOpenEditUser(user)}
                                                style={{
                                                  background: '#94a3b8',
                                                  color: 'white',
                                                  padding: '0.4rem 0.8rem',
                                                  fontSize: '0.85rem'
                                                }}
                                                title="Modifier cet utilisateur"
                                            >
                                              ✏️
                                            </button>
                                          </td>
                                        </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>

                          {/* Boutons de pagination */}
                          {users.length > itemsPerPage && (
                              <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '1rem',
                                background: 'white',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)'
                              }}>
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className="btn-filter"
                                    style={{
                                      padding: '0.5rem 0.75rem',
                                      fontSize: '0.85rem',
                                      opacity: currentPage === 1 ? 0.5 : 1,
                                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                  ⏮️ Premier
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="btn-filter"
                                    style={{
                                      padding: '0.5rem 0.75rem',
                                      fontSize: '0.85rem',
                                      opacity: currentPage === 1 ? 0.5 : 1,
                                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                  ◀️ Précédent
                                </button>

                                <span style={{
                                  padding: '0.5rem 1rem',
                                  color: 'var(--text-secondary)',
                                  fontSize: '0.9rem',
                                  fontWeight: '600'
                                }}>
                                  Page {currentPage} / {Math.ceil(users.length / itemsPerPage)}
                                </span>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(users.length / itemsPerPage), prev + 1))}
                                    disabled={currentPage >= Math.ceil(users.length / itemsPerPage)}
                                    className="btn-filter"
                                    style={{
                                      padding: '0.5rem 0.75rem',
                                      fontSize: '0.85rem',
                                      opacity: currentPage >= Math.ceil(users.length / itemsPerPage) ? 0.5 : 1,
                                      cursor: currentPage >= Math.ceil(users.length / itemsPerPage) ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                  Suivant ▶️
                                </button>
                                <button
                                    onClick={() => setCurrentPage(Math.ceil(users.length / itemsPerPage))}
                                    disabled={currentPage >= Math.ceil(users.length / itemsPerPage)}
                                    className="btn-filter"
                                    style={{
                                      padding: '0.5rem 0.75rem',
                                      fontSize: '0.85rem',
                                      opacity: currentPage >= Math.ceil(users.length / itemsPerPage) ? 0.5 : 1,
                                      cursor: currentPage >= Math.ceil(users.length / itemsPerPage) ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                  Dernier ⏭️
                                </button>
                              </div>
                          )}
                        </>
                    ) : (
                        <div className="empty-state">Aucun utilisateur trouvé</div>
                    )}
                  </div>
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
                      value={filters.tableName}la
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
                      {formatDateTimeFr(log.createdAt)}
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
                          <span className="snapshot-projet">{snapshot.projetNom}</span>
                          <span className="snapshot-version">v{snapshot.versionNumber}</span>
                          <span className="snapshot-id">#{snapshot.id}</span>
                        </div>

                        {/* Données du snapshot au moment de sa création */}
                        <div className="snapshot-data">
                          <div className="snapshot-data-row">
                            <strong>Nom du projet:</strong> {snapshot.snapshotNomProjet || 'N/A'}
                          </div>
                          <div className="snapshot-data-row">
                            <strong>Statut ID:</strong> {snapshot.snapshotStatutId || 'N/A'}
                          </div>
                          <div className="snapshot-data-row">
                            <strong>Description:</strong> {snapshot.snapshotDescription || 'N/A'}...
                          </div>
                          <div className="snapshot-data-counts">
                            <span>👥 {snapshot.nbPorteurs} porteur(s)</span>
                            <span>📋 {snapshot.nbSuivis} suivi(s)</span>
                            <span>🏷️ {snapshot.nbThematiques} thématique(s)</span>
                            <span>📄 {snapshot.nbDocuments} document(s)</span>
                            {snapshot.hasGeometry && <span>📍 Géométrie</span>}
                          </div>
                        </div>

                        <div className="snapshot-details">
                          <div className="snapshot-description">
                            {snapshot.description || 'Pas de description'}
                          </div>
                          <div className="snapshot-meta">
                            <span>Créé par: {snapshot.creator ? snapshot.creator.nomComplet : 'Système'}</span>
                            <span>Le: {formatDateTimeFr(snapshot.createdAt)}</span>
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

          {/* Tab: Demandes de suppression */}
          {activeTab === 'deletion-requests' && (
              <DeletionRequestsTab
                  apiCall={async (endpoint, options = {}) => {
                    const token = localStorage.getItem('token');
                    const response = await fetch(`http://localhost:3000/api${endpoint}`, {
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
                  }}
                  success={(message, title) => alert(`✅ ${title}\n${message}`)}
                  error={(message, title) => alert(`❌ ${title}\n${message}`)}
                  warning={(message, title) => alert(`⚠️ ${title}\n${message}`)}
              />
          )}

          {/* Tab: Versions de Sections */}
          {activeTab === 'section-versions' && (
              <SectionVersionsTab
                  apiCall={async (endpoint, options = {}) => {
                    const token = localStorage.getItem('token');
                    const response = await fetch(`http://localhost:3000/api${endpoint}`, {
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
                  }}
              />
          )}
        </div>
      </div>
  );
};

export default AdminPage;