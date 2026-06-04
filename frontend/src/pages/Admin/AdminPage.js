// frontend/src/pages/Admin/AdminPage.js

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminPage.css';
import DeletionRequestsTab from '../../components/admin/DeletionRequestsTab';
import SectionVersionsTab from '../../components/admin/SectionVersionsTab';
import UserDisplay from '../../components/common/UserDisplay';
import { formatDateTimeFr } from '../../utils/dateFormatter';
import { API_BASE_URL } from '../../config/apiConfig';

const normalizeImportHeader = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const splitCsvLine = (line, delimiter) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

const parseUsersCsv = (content) => {
  const cleanedContent = String(content || '').replace(/^\uFEFF/, '');
  const lines = cleanedContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error('Le fichier CSV doit contenir un en-tête et au moins une ligne utilisateur');
  }

  const headerLine = lines[0];
  const delimiter = (headerLine.match(/;/g) || []).length >= (headerLine.match(/,/g) || []).length ? ';' : ',';
  const headers = splitCsvLine(headerLine, delimiter).map(normalizeImportHeader);

  const getIndex = (aliases) => aliases
    .map((alias) => headers.indexOf(alias))
    .find((index) => index !== -1);

  const usernameIndex = getIndex(['username', 'identifiant', 'login', 'utilisateur']);
  if (usernameIndex === undefined) {
    throw new Error('Colonne "username" introuvable dans le fichier CSV');
  }

  const prenomIndex = getIndex(['prenom', 'first_name', 'firstname']);
  const nomIndex = getIndex(['nom', 'last_name', 'lastname']);
  const roleLabelIndex = getIndex(['role', 'role_libelle', 'role label', 'libelle_role']);
  const roleIdIndex = getIndex(['role_id', 'id_role']);

  return lines.slice(1).map((line, lineIndex) => {
    const columns = splitCsvLine(line, delimiter);
    const username = columns[usernameIndex]?.trim();

    if (!username) return null;

    return {
      username,
      prenom: prenomIndex !== undefined ? (columns[prenomIndex] || '').trim() || null : null,
      nom: nomIndex !== undefined ? (columns[nomIndex] || '').trim() || null : null,
      role_libelle: roleLabelIndex !== undefined ? (columns[roleLabelIndex] || '').trim() || null : null,
      role_id: roleIdIndex !== undefined ? (columns[roleIdIndex] || '').trim() || null : null,
      _lineNumber: lineIndex + 2
    };
  }).filter(Boolean);
};

const AdminPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('stats');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // États pour les différentes données
  const [stats, setStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotProjects, setSnapshotProjects] = useState([]);
  const [expandedSnapshotIds, setExpandedSnapshotIds] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [deletedProjects, setDeletedProjects] = useState([]);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [securityLogsTotal, setSecurityLogsTotal] = useState(0);
  const [filters, setFilters] = useState({
    limit: 100,
    tableName: '',
    action: '',
    dateFrom: '',
    dateTo: ''
  });
  const [securityFilters, setSecurityFilters] = useState({
    limit: 100,
    offset: 0,
    event_type: '',
    username: ''
  });
  const [snapshotFilters, setSnapshotFilters] = useState({
    query: '',
    projectId: '',
    creator: '',
    type: '',
    withGeometryOnly: false
  });
  const [snapshotForm, setSnapshotForm] = useState({
    projectId: '',
    description: ''
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
  const [showImportUsersPanel, setShowImportUsersPanel] = useState(false);
  const [importUsersFileName, setImportUsersFileName] = useState('');
  const [importUsersRows, setImportUsersRows] = useState([]);
  const [importUsersPreview, setImportUsersPreview] = useState(null);
  const [importDeactivateIds, setImportDeactivateIds] = useState([]);
  const [importResult, setImportResult] = useState(null);

  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [userSearchQuery, setUserSearchQuery] = useState('');

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
      fetchAdminProjects();
    } else if (activeTab === 'users') {
      fetchUsers();
      fetchRoles();
    } else if (activeTab === 'deleted-projects') {
      fetchDeletedProjects();
    } else if (activeTab === 'security-logs') {
      fetchSecurityLogs();
    }
  }, [activeTab]);

  // Auto-refresh audit logs when filters change
  useEffect(() => {
    if (activeTab === 'audit') {
      console.log('🔄 [ADMIN] Filtres modifiés, rechargement des logs d\'audit');
      fetchAuditLogs();
    }
  }, [filters]);

  // Auto-refresh security logs when filters change
  useEffect(() => {
    if (activeTab === 'security-logs') {
      console.log('🔄 [ADMIN] Filtres modifiés, rechargement des logs de sécurité');
      fetchSecurityLogs();
    }
  }, [securityFilters]);

  // Revenir à la première page lors d'une recherche utilisateur
  useEffect(() => {
    if (activeTab === 'users') {
      setCurrentPage(1);
    }
  }, [userSearchQuery, activeTab]);

  const fetchStats = async () => {
    console.log('📊 [ADMIN] Début du chargement des statistiques');
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      console.log('📤 [ADMIN] Requête GET stats');

      const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
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

      const response = await fetch(`${API_BASE_URL}/api/admin/audit?${params}`, {
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

      const response = await fetch(`${API_BASE_URL}/api/admin/snapshots?limit=100`, {
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

  const fetchAdminProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/projets`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erreur lors du chargement des projets');

      const data = await response.json();
      setSnapshotProjects(data.data || []);
    } catch (err) {
      console.error('❌ [ADMIN] Erreur lors du chargement des projets admin:', err);
    }
  };

  const fetchUsers = async () => {
    console.log('👥 [ADMIN] Début du chargement des utilisateurs');
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
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

  const fetchDeletedProjects = async () => {
    console.log('🗑️ [ADMIN] Chargement des projets supprimés');
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/deleted-projects`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erreur lors du chargement des projets supprimés');

      const data = await response.json();
      console.log('✅ [ADMIN] Projets supprimés chargés:', data.data);
      setDeletedProjects(data.data || []);
    } catch (err) {
      console.error('❌ [ADMIN] Erreur projets supprimés:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour charger les logs de sécurité
  const fetchSecurityLogs = async () => {
    console.log('🔒 [ADMIN] Chargement des logs de sécurité');
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        limit: securityFilters.limit.toString(),
        offset: securityFilters.offset.toString()
      });
      
      if (securityFilters.event_type) {
        params.append('event_type', securityFilters.event_type);
      }
      if (securityFilters.username) {
        params.append('username', securityFilters.username);
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/security-logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erreur lors du chargement des logs de sécurité');

      const data = await response.json();
      console.log('✅ [ADMIN] Logs de sécurité chargés:', data.data);
      setSecurityLogs(data.data.logs || []);
      setSecurityLogsTotal(data.data.total || 0);
    } catch (err) {
      console.error('❌ [ADMIN] Erreur logs de sécurité:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreProject = async (projectId, projectName) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir restaurer le projet "${projectName}" ?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/projets/${projectId}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de la restauration');
      }

      const data = await response.json();
      alert(`✅ ${data.message}`);

      // Recharger la liste des projets supprimés
      fetchDeletedProjects();
    } catch (err) {
      console.error('❌ Erreur lors de la restauration:', err);
      alert(`❌ Erreur: ${err.message}`);
    }
  };

  // Fonction pour télécharger les audits
  const handleDownloadAudits = async (format = 'csv') => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('format', format);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.tableName) params.append('tableName', filters.tableName);
      if (filters.action) params.append('action', filters.action);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const response = await fetch(`${API_BASE_URL}/api/admin/audit/export?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de l\'export');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `audit_logs.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) filename = filenameMatch[1];
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert(`✅ Export ${format.toUpperCase()} réussi !`);
    } catch (error) {
      console.error('Erreur téléchargement audits:', error);
      alert(`❌ Erreur: ${error.message}`);
    }
  };

  // Fonction pour télécharger les snapshots
  const handleDownloadSnapshots = async (format = 'csv') => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('format', format);
      params.append('limit', 1000);

      const response = await fetch(`${API_BASE_URL}/api/admin/snapshots/export?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de l\'export');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `snapshots.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) filename = filenameMatch[1];
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert(`✅ Export ${format.toUpperCase()} réussi !`);
    } catch (error) {
      console.error('Erreur téléchargement snapshots:', error);
      alert(`❌ Erreur: ${error.message}`);
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
      const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
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

  const resetImportUsersState = () => {
    setImportUsersFileName('');
    setImportUsersRows([]);
    setImportUsersPreview(null);
    setImportDeactivateIds([]);
    setImportResult(null);
  };

  const handleImportUsersFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const parsedUsers = parseUsersCsv(content);

      if (parsedUsers.length === 0) {
        throw new Error('Aucun utilisateur exploitable trouvé dans le fichier');
      }

      setImportUsersFileName(file.name);
      setImportUsersRows(parsedUsers);
      setImportUsersPreview(null);
      setImportDeactivateIds([]);
      setImportResult(null);
    } catch (err) {
      console.error('❌ [ADMIN] Erreur parsing import CSV:', err);
      alert(`❌ Erreur import CSV: ${err.message}`);
      resetImportUsersState();
    } finally {
      event.target.value = '';
    }
  };

  const handlePreviewImportUsers = async () => {
    if (importUsersRows.length === 0) {
      alert('❌ Chargez un fichier CSV avant de lancer l’aperçu');
      return;
    }

    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/users/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          preview: true,
          users: importUsersRows
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de l’aperçu d’import');
      }

      setImportUsersPreview(data.data);
      setImportDeactivateIds(
        (data.data?.deactivateCandidates || [])
          .filter((user) => user.can_deactivate)
          .map((user) => user.id_user)
      );
      setImportResult(null);
    } catch (err) {
      console.error('❌ [ADMIN] Erreur aperçu import users:', err);
      alert(`❌ Erreur: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleImportDeactivateUser = (userId) => {
    setImportDeactivateIds((prev) => (
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    ));
  };

  const handleApplyImportUsers = async () => {
    if (!importUsersPreview) {
      alert('❌ Lancez d’abord l’aperçu de synchronisation');
      return;
    }

    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/users/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          preview: false,
          users: importUsersRows,
          deactivateUserIds: importDeactivateIds
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de l’import');
      }

      setImportResult(data.data);
      alert('✅ Import des utilisateurs terminé');
      fetchUsers();
    } catch (err) {
      console.error('❌ [ADMIN] Erreur application import users:', err);
      alert(`❌ Erreur: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Gérer la sélection de tous les utilisateurs
  const handleSelectAll = (e) => {
    const currentUserId = JSON.parse(localStorage.getItem('user') || '{}').id_user;
    const normalize = (value) => String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const normalizedQuery = normalize(userSearchQuery).trim();

    const visibleSelectableUserIds = users
      .filter((user) => {
        if (!normalizedQuery) return true;
        const username = normalize(user.username);
        const nomComplet = normalize(user.nom_complet || `${user.prenom || ''} ${user.nom || ''}`.trim());
        return username.includes(normalizedQuery) || nomComplet.includes(normalizedQuery);
      })
      .filter((user) => user.is_active !== false)
      .filter(u => u.id_user !== currentUserId)
      .map(u => u.id_user);

    if (e.target.checked) {
      setSelectedUserIds(prev => [...new Set([...prev, ...visibleSelectableUserIds])]);
    } else {
      setSelectedUserIds(prev => prev.filter(id => !visibleSelectableUserIds.includes(id)));
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
      alert('❌ Veuillez sélectionner au moins un utilisateur à désactiver');
      return;
    }

    const confirmMessage = `Êtes-vous sûr de vouloir désactiver ${idsToDelete.length} utilisateur(s) ?\n\nIls ne pourront plus se connecter, mais leur historique sera conservé.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    console.log('⛔ [ADMIN] Début de désactivation des utilisateurs');
    console.log('📝 [ADMIN] IDs:', idsToDelete);

    try {
      setIsLoading(true);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
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
        throw new Error(data.message || 'Erreur lors de la désactivation des utilisateurs');
      }

      console.log('✅ [ADMIN] Utilisateurs désactivés avec succès!');
      alert(`✅ ${data.data.deactivatedCount} utilisateur(s) désactivé(s) avec succès !`);

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

  const handleReactivateUser = async (user) => {
    try {
      setIsLoading(true);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${user.id_user}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prenom: user.prenom || null,
          nom: user.nom || null,
          role_id: user.role_id || null,
          is_active: true
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la réactivation de l\'utilisateur');
      }

      alert('✅ Utilisateur réactivé avec succès !');
      fetchUsers();
    } catch (err) {
      console.error('❌ [ADMIN] Erreur lors de la réactivation:', err);
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

      const response = await fetch(`${API_BASE_URL}/api/admin/users/${editingUser.id_user}`, {
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

      const response = await fetch(`${API_BASE_URL}/api/admin/restore`, {
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

      alert(`✅ Projet restauré avec succès !

⚠️ IMPORTANT : Pour voir les changements, vous devez :
1. Actualiser la page de visualisation (F5)
2. Ou fermer et rouvrir le projet dans la vue liste

Les modifications ont bien été appliquées en base de données.`);

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

  const handleCreateSnapshot = async (idProjet, customDescription = '') => {
    console.log('📸 [ADMIN] Début de création manuelle de snapshot');
    console.log('🆔 [ADMIN] ID Projet:', idProjet);

    if (!idProjet) {
      alert('❌ Sélectionnez un projet avant de créer un snapshot.');
      return;
    }

    const description = customDescription;

    console.log('📝 [ADMIN] Description:', description || '(vide)');

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const requestBody = {
        idProjet,
        description
      };

      console.log('📤 [ADMIN] Body de la requête:', requestBody);

      const response = await fetch(`${API_BASE_URL}/api/admin/snapshots`, {
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
      setSnapshotForm({ projectId: '', description: '' });

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

  const normalizeSearchValue = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const inferSnapshotType = (snapshot) => {
    const description = String(snapshot?.description || '').toLowerCase();
    if (description.includes('manuel')) return 'manuel';
    if (description.includes('avant modification')) return 'avant modification';
    if (description.includes('jalon')) return 'jalon';
    return 'automatique';
  };

  const formatSnapshotTypeLabel = (type) => {
    const labels = {
      manuel: 'Manuel',
      'avant modification': 'Avant modif',
      jalon: 'Jalon',
      automatique: 'Auto'
    };
    return labels[type] || type;
  };

  const toggleSnapshotExpanded = (snapshotId) => {
    setExpandedSnapshotIds((prev) => (
      prev.includes(snapshotId)
        ? prev.filter((id) => id !== snapshotId)
        : [...prev, snapshotId]
    ));
  };

  const filteredSnapshots = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(snapshotFilters.query).trim();
    const normalizedCreator = normalizeSearchValue(snapshotFilters.creator).trim();

    return snapshots.filter((snapshot) => {
      const type = inferSnapshotType(snapshot);
      const projectIdMatches = !snapshotFilters.projectId || snapshot.idProjet === snapshotFilters.projectId;
      const typeMatches = !snapshotFilters.type || type === snapshotFilters.type;
      const geometryMatches = !snapshotFilters.withGeometryOnly || snapshot.hasGeometry;

      if (!projectIdMatches || !typeMatches || !geometryMatches) return false;

      if (normalizedQuery) {
        const haystacks = [
          snapshot.projetNom,
          snapshot.idProjet,
          snapshot.snapshotNomProjet,
          snapshot.snapshotDescription,
          snapshot.description,
          snapshot.snapshotStatutLabel,
          snapshot.snapshotServiceLabel
        ].map(normalizeSearchValue);

        if (!haystacks.some((value) => value.includes(normalizedQuery))) {
          return false;
        }
      }

      if (normalizedCreator) {
        const creatorLabel = normalizeSearchValue(
          snapshot.creator?.nomComplet || snapshot.creator?.username || ''
        );
        if (!creatorLabel.includes(normalizedCreator)) {
          return false;
        }
      }

      return true;
    });
  }, [snapshotFilters, snapshots]);

  const snapshotStats = useMemo(() => ({
    total: filteredSnapshots.length,
    manuals: filteredSnapshots.filter((snapshot) => inferSnapshotType(snapshot) === 'manuel').length,
    current: filteredSnapshots.filter((snapshot) => snapshot.isCurrent).length,
    withGeometry: filteredSnapshots.filter((snapshot) => snapshot.hasGeometry).length
  }), [filteredSnapshots]);

  const normalizedUserSearchQuery = normalizeSearchValue(userSearchQuery).trim();

  const filteredUsers = users.filter((user) => {
    if (!normalizedUserSearchQuery) return true;

    const normalizedUsername = normalizeSearchValue(user.username);
    const normalizedNomComplet = normalizeSearchValue(
      user.nom_complet || `${user.prenom || ''} ${user.nom || ''}`.trim()
    );

    return (
      normalizedUsername.includes(normalizedUserSearchQuery) ||
      normalizedNomComplet.includes(normalizedUserSearchQuery)
    );
  });

  const currentUserId = JSON.parse(localStorage.getItem('user') || '{}').id_user;
  const selectableFilteredUserIds = filteredUsers
    .filter((user) => user.is_active !== false)
    .filter((user) => user.id_user !== currentUserId)
    .map((user) => user.id_user);
  const areAllFilteredUsersSelected = selectableFilteredUserIds.length > 0 &&
    selectableFilteredUserIds.every((id) => selectedUserIds.includes(id));

  const totalFilteredUsers = filteredUsers.length;
  const totalUserPages = Math.max(1, Math.ceil(totalFilteredUsers / itemsPerPage));
  const adjustedCurrentPage = Math.min(currentPage, totalUserPages);
  const paginatedUsers = filteredUsers.slice(
    (adjustedCurrentPage - 1) * itemsPerPage,
    adjustedCurrentPage * itemsPerPage
  );
  const firstVisibleUserIndex = totalFilteredUsers === 0
    ? 0
    : ((adjustedCurrentPage - 1) * itemsPerPage) + 1;
  const lastVisibleUserIndex = totalFilteredUsers === 0
    ? 0
    : Math.min(adjustedCurrentPage * itemsPerPage, totalFilteredUsers);

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
              className={`tab ${activeTab === 'security-logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('security-logs')}
          >
            🔒 Historique de connexion
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
              className={`tab ${activeTab === 'archive-requests' ? 'active' : ''}`}
              onClick={() => setActiveTab('archive-requests')}
          >
            🗃️ Demandes d'archivage
          </button>
          <button
              className={`tab ${activeTab === 'deleted-projects' ? 'active' : ''}`}
              onClick={() => setActiveTab('deleted-projects')}
          >
            ♻️ Projets supprimés
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
                              onClick={() => handleDeleteUsers()}
                              style={{ background: '#c89090' }}
                          >
                            ⛔ Désactiver ({selectedUserIds.length})
                          </button>
                      )}
                      <button
                          className="btn-filter"
                          onClick={() => {
                            setShowCreateUserForm(!showCreateUserForm);
                            setEditingUser(null); // Fermer le formulaire d'édition
                            setShowImportUsersPanel(false);
                          }}
                      >
                        {showCreateUserForm ? 'Annuler' : '+ Créer un utilisateur'}
                      </button>
                      <button
                          className="btn-filter"
                          onClick={() => {
                            setShowImportUsersPanel(!showImportUsersPanel);
                            setShowCreateUserForm(false);
                            setEditingUser(null);
                          }}
                      >
                        {showImportUsersPanel ? 'Fermer l’import' : '⇪ Importer une liste'}
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

                  {showImportUsersPanel && (
                      <div className="create-user-form import-users-panel">
                        <div className="import-users-header">
                          <div>
                            <h3 className="import-users-title">Import d’utilisateurs</h3>
                            <p className="import-users-subtitle">
                              Format CSV attendu : `username` obligatoire. Colonnes optionnelles : `prenom`, `nom`, `role_libelle` ou `role_id`.
                            </p>
                          </div>
                          <button
                              type="button"
                              className="btn-secondary"
                              onClick={resetImportUsersState}
                          >
                            Réinitialiser
                          </button>
                        </div>

                        <div className="import-users-toolbar">
                          <label className="import-users-file">
                            <span>Charger un fichier CSV</span>
                            <input
                                type="file"
                                accept=".csv,text/csv"
                                onChange={handleImportUsersFile}
                            />
                          </label>
                          <button
                              type="button"
                              className="btn-primary"
                              onClick={handlePreviewImportUsers}
                              disabled={isLoading || importUsersRows.length === 0}
                          >
                            {isLoading ? 'Analyse...' : 'Prévisualiser la synchronisation'}
                          </button>
                          {importUsersFileName && (
                              <div className="import-users-file-meta">
                                <span className="import-users-file-name">{importUsersFileName}</span>
                                <span>{importUsersRows.length} ligne(s)</span>
                              </div>
                          )}
                        </div>

                        {importUsersPreview && (
                            <div className="import-users-content">
                              <div className="import-users-summary">
                                <div className="stat-card"><div className="stat-value">{importUsersPreview.summary.importedCount}</div><div className="stat-label">Importés</div></div>
                                <div className="stat-card"><div className="stat-value">{importUsersPreview.summary.newCount}</div><div className="stat-label">Nouveaux comptes</div></div>
                                <div className="stat-card"><div className="stat-value">{importUsersPreview.summary.existingCount}</div><div className="stat-label">Déjà présents</div></div>
                                <div className="stat-card"><div className="stat-value">{importUsersPreview.summary.reactivatableCount}</div><div className="stat-label">À réactiver</div></div>
                                <div className="stat-card"><div className="stat-value">{importUsersPreview.summary.deactivateCandidateCount}</div><div className="stat-label">Propositions désactivation</div></div>
                              </div>

                              {importUsersPreview.duplicates?.length > 0 && (
                                  <div className="import-users-warning">
                                    Doublons ignorés dans le fichier : {importUsersPreview.duplicates.join(', ')}
                                  </div>
                              )}

                              {importUsersPreview.deactivateCandidates?.length > 0 && (
                                  <div className="import-users-box">
                                    <h4 className="import-users-box-title">Comptes absents de la nouvelle liste</h4>
                                    <p className="import-users-box-text">
                                      Coche les comptes à désactiver. Les comptes déjà absents du nouveau fichier mais non cochés resteront actifs.
                                    </p>
                                    <div className="import-users-checkbox-list">
                                      {importUsersPreview.deactivateCandidates.map((user) => (
                                          <label key={user.id_user} className={`import-users-checkbox-row ${user.can_deactivate ? '' : 'is-disabled'}`}>
                                            <input
                                                type="checkbox"
                                                checked={importDeactivateIds.includes(user.id_user)}
                                                disabled={!user.can_deactivate}
                                                onChange={() => handleToggleImportDeactivateUser(user.id_user)}
                                            />
                                            <span className="import-users-checkbox-text">
                                              <strong>{user.username}</strong>
                                              <span>{user.nom_complet}</span>
                                              <span>{user.role_libelle}</span>
                                              {!user.can_deactivate && ' (compte courant non désactivable)'}
                                            </span>
                                          </label>
                                      ))}
                                    </div>
                                  </div>
                              )}

                              <div className="import-users-actions">
                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={handleApplyImportUsers}
                                    disabled={isLoading}
                                >
                                  {isLoading ? 'Import...' : 'Appliquer la synchronisation'}
                                </button>
                              </div>
                            </div>
                        )}

                        {importResult && (
                            <div className="import-users-result">
                              <h4 className="import-users-box-title">Résultat de l’import</h4>
                              <p className="import-users-box-text">
                                Créés: {importResult.summary.createdCount} · Réactivés: {importResult.summary.reactivatedCount} · Désactivés: {importResult.summary.deactivatedCount}
                              </p>

                              {importResult.createdUsers?.length > 0 && (
                                  <>
                                    <p className="import-users-passwords-title">
                                      Mots de passe provisoires des nouveaux comptes :
                                    </p>
                                    <div className="import-users-table-wrap">
                                      <table className="users-table">
                                        <thead>
                                        <tr>
                                          <th>Username</th>
                                          <th>Nom complet</th>
                                          <th>Rôle</th>
                                          <th>Mot de passe provisoire</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {importResult.createdUsers.map((user) => (
                                            <tr key={user.username}>
                                              <td>{user.username}</td>
                                              <td>{`${user.prenom || ''} ${user.nom || ''}`.trim() || user.username}</td>
                                              <td>{user.role_libelle}</td>
                                              <td className="import-users-password-cell">{user.temporaryPassword}</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </>
                              )}
                            </div>
                        )}
                      </div>
                  )}

                  {/* Liste des utilisateurs */}
                  <div className="users-list">
                    {users.length > 0 ? (
                        <>
                          {/* Contrôles de pagination */}
                          <div style={{
                            marginBottom: '1rem',
                            padding: '1rem',
                            background: 'white',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)'
                          }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'flex-start',
                              alignItems: 'center',
                              gap: '1.75rem',
                              flexWrap: 'nowrap'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '0 1 640px', minWidth: 0, maxWidth: '640px' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                                  Recherche:
                                </span>
                                <input
                                    type="text"
                                    value={userSearchQuery}
                                    onChange={(e) => setUserSearchQuery(e.target.value)}
                                    placeholder="Username ou nom complet"
                                    style={{
                                      flex: 1,
                                      minWidth: '220px',
                                      padding: '0.5rem 0.75rem',
                                      borderRadius: '6px',
                                      border: '1px solid var(--border-color)',
                                      fontSize: '0.9rem'
                                    }}
                                />
                                {userSearchQuery.trim() && (
                                    <button
                                        type="button"
                                        className="btn-filter"
                                        onClick={() => setUserSearchQuery('')}
                                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                                    >
                                      Effacer
                                    </button>
                                )}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'nowrap', flexShrink: 0, marginLeft: '0.5rem' }}>
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
                                  {totalFilteredUsers > 0 && (
                                      <option value={totalFilteredUsers}>Tous ({totalFilteredUsers})</option>
                                  )}
                                </select>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                                  éléments par page
                                </span>
                              </div>
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.75rem', textAlign: 'right' }}>
                              {totalFilteredUsers === 0 ? 'Aucun résultat' : `${firstVisibleUserIndex}-${lastVisibleUserIndex} / ${totalFilteredUsers}`}
                            </div>
                          </div>

                          {totalFilteredUsers > 0 ? (
                              <>
                                {/* Table avec scroll horizontal */}
                                <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                                  <table className="users-table">
                                    <thead>
                                    <tr>
                                      <th className="th-checkbox">
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={areAllFilteredUsersSelected}
                                        />
                                      </th>
                                      <th className="th-username">Username</th>
                                      <th className="th-nom">Nom complet</th>
                                      <th>Statut</th>
                                      <th className="th-role">Rôle</th>
                                      <th className="th-date">Créé le</th>
                                      <th className="th-actions">Actions</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {paginatedUsers.map(user => {
                                      const isCurrentUser = user.id_user === currentUserId;

                                      return (
                                          <tr key={user.id_user} style={{ opacity: isCurrentUser ? 0.6 : 1 }}>
                                            <td className="td-checkbox">
                                              <input
                                                  type="checkbox"
                                                  checked={selectedUserIds.includes(user.id_user)}
                                                  onChange={() => handleSelectUser(user.id_user)}
                                                  disabled={isCurrentUser || user.is_active === false}
                                              />
                                            </td>
                                            <td className="td-username">
                                              {user.username}
                                              {isCurrentUser && <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#6b7280' }}>(Vous)</span>}
                                            </td>
                                            <td className="td-nom">
                                              <UserDisplay
                                                name={user.nom_complet}
                                                username={user.username}
                                                isActive={user.is_active}
                                                showInactiveBadge={false}
                                              />
                                            </td>
                                            <td>
                                              <span className={`status-badge ${user.is_active === false ? 'status-inactive' : 'status-active'}`}>
                                                {user.is_active === false ? 'Inactif' : 'Actif'}
                                              </span>
                                            </td>
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
                                              {user.is_active === false && (
                                                <button
                                                  className="btn-filter"
                                                  onClick={() => handleReactivateUser(user)}
                                                  style={{
                                                    background: '#86b89d',
                                                    color: 'white',
                                                    padding: '0.4rem 0.8rem',
                                                    fontSize: '0.85rem',
                                                    marginLeft: '0.5rem'
                                                  }}
                                                  title="Réactiver cet utilisateur"
                                                >
                                                  ↩️
                                                </button>
                                              )}
                                            </td>
                                          </tr>
                                      );
                                    })}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Boutons de pagination */}
                                {totalFilteredUsers > itemsPerPage && (
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
                                          disabled={adjustedCurrentPage === 1}
                                          className="btn-filter"
                                          style={{
                                            padding: '0.5rem 0.75rem',
                                            fontSize: '0.85rem',
                                            opacity: adjustedCurrentPage === 1 ? 0.5 : 1,
                                            cursor: adjustedCurrentPage === 1 ? 'not-allowed' : 'pointer'
                                          }}
                                      >
                                        ⏮️ Premier
                                      </button>
                                      <button
                                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                          disabled={adjustedCurrentPage === 1}
                                          className="btn-filter"
                                          style={{
                                            padding: '0.5rem 0.75rem',
                                            fontSize: '0.85rem',
                                            opacity: adjustedCurrentPage === 1 ? 0.5 : 1,
                                            cursor: adjustedCurrentPage === 1 ? 'not-allowed' : 'pointer'
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
                                        Page {adjustedCurrentPage} / {totalUserPages}
                                      </span>

                                      <button
                                          onClick={() => setCurrentPage(prev => Math.min(totalUserPages, prev + 1))}
                                          disabled={adjustedCurrentPage >= totalUserPages}
                                          className="btn-filter"
                                          style={{
                                            padding: '0.5rem 0.75rem',
                                            fontSize: '0.85rem',
                                            opacity: adjustedCurrentPage >= totalUserPages ? 0.5 : 1,
                                            cursor: adjustedCurrentPage >= totalUserPages ? 'not-allowed' : 'pointer'
                                          }}
                                      >
                                        Suivant ▶️
                                      </button>
                                      <button
                                          onClick={() => setCurrentPage(totalUserPages)}
                                          disabled={adjustedCurrentPage >= totalUserPages}
                                          className="btn-filter"
                                          style={{
                                            padding: '0.5rem 0.75rem',
                                            fontSize: '0.85rem',
                                            opacity: adjustedCurrentPage >= totalUserPages ? 0.5 : 1,
                                            cursor: adjustedCurrentPage >= totalUserPages ? 'not-allowed' : 'pointer'
                                          }}
                                      >
                                        Dernier ⏭️
                                      </button>
                                    </div>
                                )}
                              </>
                          ) : (
                              <div className="empty-state">Aucun utilisateur ne correspond à la recherche</div>
                          )}
                        </>
                    ) : (
                        <div className="empty-state">Aucun utilisateur trouvé</div>
                    )}
                  </div>
                </div>
              </div>
          )}

          {/* Tab: Historique de connexion */}
          {activeTab === 'security-logs' && !isLoading && (
              <div className="security-logs-container">
                <div className="stats-section">
                  <h2>Historique des connexions et tentatives</h2>
                  
                  {/* Filtres */}
                  <div className="audit-filters" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        placeholder="Filtrer par utilisateur"
                        value={securityFilters.username}
                        onChange={(e) => setSecurityFilters({ ...securityFilters, username: e.target.value })}
                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                    />
                    <select
                        value={securityFilters.event_type}
                        onChange={(e) => setSecurityFilters({ ...securityFilters, event_type: e.target.value })}
                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                    >
                      <option value="">Tous les événements</option>
                      <option value="LOGIN_SUCCESS">Connexion réussie</option>
                      <option value="LOGIN_FAILED">Connexion échouée</option>
                      <option value="FIRST_LOGIN">Première connexion</option>
                      <option value="LOGIN_BLOCKED">Connexion bloquée</option>
                      <option value="RATE_LIMIT_EXCEEDED">Limite de tentatives</option>
                      <option value="INVALID_INPUT">Entrée invalide</option>
                    </select>
                    <button
                        onClick={fetchSecurityLogs}
                        className="btn-primary"
                        style={{ padding: '0.5rem 1rem', borderRadius: '4px' }}
                    >
                      🔄 Actualiser
                    </button>
                  </div>

                  {/* Stats */}
                  <div style={{ marginBottom: '1rem', color: '#6b7280' }}>
                    Affichage de {securityLogs.length} sur {securityLogsTotal} logs
                  </div>

                  {/* Table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table className="audit-table" style={{ 
                      width: '100%',
                      borderCollapse: 'separate',
                      borderSpacing: 0
                    }}>
                      <thead>
                      <tr>
                        <th style={{ padding: '1rem' }}>Date & Heure</th>
                        <th style={{ padding: '1rem' }}>Utilisateur</th>
                        <th style={{ padding: '1rem' }}>Événement</th>
                        <th style={{ padding: '1rem' }}>Sévérité</th>
                        <th style={{ padding: '1rem' }}>IP</th>
                        <th style={{ padding: '1rem' }}>Statut</th>
                        <th style={{ padding: '1rem' }}>Détails</th>
                      </tr>
                      </thead>
                      <tbody>
                      {securityLogs.length === 0 ? (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                              Aucun log de sécurité
                            </td>
                          </tr>
                      ) : (
                          securityLogs.map((log) => (
                              <tr key={log.id}>
                                <td style={{ padding: '1rem', verticalAlign: 'top' }}>{formatDateTimeFr(log.timestamp)}</td>
                                <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                                  <strong>{log.user_full_name || log.username || 'N/A'}</strong>
                                </td>
                                <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                                    <span style={{
                                      padding: '0.25rem 0.5rem',
                                      borderRadius: '4px',
                                      fontSize: '0.85rem',
                                      backgroundColor:
                                          log.event_type === 'LOGIN_SUCCESS' ? '#d1fae5' :
                                              log.event_type === 'FIRST_LOGIN' ? '#dbeafe' :
                                                  log.event_type === 'LOGIN_FAILED' ? '#fee2e2' :
                                                      log.event_type === 'LOGIN_BLOCKED' ? '#fecaca' :
                                                          '#f3f4f6',
                                      color:
                                          log.event_type === 'LOGIN_SUCCESS' ? '#065f46' :
                                              log.event_type === 'FIRST_LOGIN' ? '#1e40af' :
                                                  log.event_type === 'LOGIN_FAILED' ? '#b91c1c' :
                                                      log.event_type === 'LOGIN_BLOCKED' ? '#991b1b' :
                                                          '#374151'
                                    }}>
                                      {log.event_type.replace(/_/g, ' ')}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                                    <span style={{
                                      padding: '0.25rem 0.5rem',
                                      borderRadius: '4px',
                                      fontSize: '0.85rem',
                                      backgroundColor:
                                          log.severity === 'CRITICAL' ? '#fecaca' :
                                              log.severity === 'ERROR' ? '#fee2e2' :
                                                  log.severity === 'WARNING' ? '#fef3c7' :
                                                      '#dbeafe',
                                      color:
                                          log.severity === 'CRITICAL' ? '#991b1b' :
                                              log.severity === 'ERROR' ? '#b91c1c' :
                                                  log.severity === 'WARNING' ? '#92400e' :
                                                      '#1e40af'
                                    }}>
                                      {log.severity}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                                  <code style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                    {log.ip_address || 'N/A'}
                                  </code>
                                </td>
                                <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                                  {log.status === 'SUCCESS' ? (
                                      <span style={{ color: '#10b981' }}>✓ Succès</span>
                                  ) : log.status === 'FAILURE' ? (
                                      <span style={{ color: '#ef4444' }}>✗ Échec</span>
                                  ) : (
                                      <span style={{ color: '#6b7280' }}>-</span>
                                  )}
                                </td>
                                <td style={{ padding: '1rem', verticalAlign: 'top', maxWidth: '300px' }}>
                                  {log.details && typeof log.details === 'object' ? (
                                      <details style={{ cursor: 'pointer' }}>
                                        <summary style={{ fontSize: '0.85rem', color: '#6b7280' }}>Voir détails</summary>
                                        <pre style={{
                                          fontSize: '0.75rem',
                                          backgroundColor: '#f3f4f6',
                                          padding: '0.5rem',
                                          borderRadius: '4px',
                                          marginTop: '0.5rem',
                                          overflow: 'auto',
                                          maxHeight: '200px'
                                        }}>
                                          {JSON.stringify(log.details, null, 2)}
                                        </pre>
                                      </details>
                                  ) : (
                                      <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>-</span>
                                  )}
                                </td>
                              </tr>
                          ))
                      )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <button
                        onClick={() => setSecurityFilters({ ...securityFilters, offset: Math.max(0, securityFilters.offset - securityFilters.limit) })}
                        disabled={securityFilters.offset === 0}
                        className="btn-secondary"
                        style={{ padding: '0.5rem 1rem' }}
                    >
                      ← Précédent
                    </button>
                    <span style={{ padding: '0.5rem 1rem', color: '#6b7280' }}>
                      {Math.floor(securityFilters.offset / securityFilters.limit) + 1} / {Math.ceil(securityLogsTotal / securityFilters.limit)}
                    </span>
                    <button
                        onClick={() => setSecurityFilters({ ...securityFilters, offset: securityFilters.offset + securityFilters.limit })}
                        disabled={securityFilters.offset + securityFilters.limit >= securityLogsTotal}
                        className="btn-secondary"
                        style={{ padding: '0.5rem 1rem' }}
                    >
                      Suivant →
                    </button>
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
                  <button onClick={() => handleDownloadAudits('csv')} className="btn-download" title="Télécharger en CSV">📥 CSV</button>
                  <button onClick={() => handleDownloadAudits('json')} className="btn-download" title="Télécharger en JSON">📥 JSON</button>
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
                <div className="snapshots-toolbar">
                  <div>
                    <h3 style={{ margin: 0 }}>Snapshots de projets</h3>
                    <p className="snapshots-subtitle">
                      Consulte, filtre, crée et restaure les états complets d’un projet.
                    </p>
                  </div>
                  <div className="snapshots-toolbar-actions">
                    <button onClick={() => handleDownloadSnapshots('csv')} className="btn-download" title="Télécharger en CSV">📥 CSV</button>
                    <button onClick={() => handleDownloadSnapshots('json')} className="btn-download" title="Télécharger en JSON">📥 JSON</button>
                  </div>
                </div>

                <div className="snapshots-quick-stats">
                  <div className="snapshot-kpi">
                    <span className="snapshot-kpi-label">Visibles</span>
                    <span className="snapshot-kpi-value">{snapshotStats.total}</span>
                  </div>
                  <div className="snapshot-kpi">
                    <span className="snapshot-kpi-label">Manuels</span>
                    <span className="snapshot-kpi-value">{snapshotStats.manuals}</span>
                  </div>
                  <div className="snapshot-kpi">
                    <span className="snapshot-kpi-label">Courants</span>
                    <span className="snapshot-kpi-value">{snapshotStats.current}</span>
                  </div>
                  <div className="snapshot-kpi">
                    <span className="snapshot-kpi-label">Avec géométrie</span>
                    <span className="snapshot-kpi-value">{snapshotStats.withGeometry}</span>
                  </div>
                </div>

                <div className="snapshots-create-panel">
                  <div className="snapshot-panel-title">Créer un snapshot manuel</div>
                  <div className="snapshots-create-grid">
                    <select
                      value={snapshotForm.projectId}
                      onChange={(e) => setSnapshotForm((prev) => ({ ...prev, projectId: e.target.value }))}
                    >
                      <option value="">Sélectionner un projet</option>
                      {snapshotProjects.map((project) => (
                        <option key={project.id_projet} value={project.id_projet}>
                          {project.display_label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Description du jalon ou du contexte"
                      value={snapshotForm.description}
                      onChange={(e) => setSnapshotForm((prev) => ({ ...prev, description: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleCreateSnapshot(snapshotForm.projectId, snapshotForm.description)}
                    >
                      📸 Créer le snapshot
                    </button>
                  </div>
                </div>

                <div className="snapshots-filter-panel">
                  <input
                    type="text"
                    placeholder="Rechercher un projet, une description, un statut…"
                    value={snapshotFilters.query}
                    onChange={(e) => setSnapshotFilters((prev) => ({ ...prev, query: e.target.value }))}
                  />
                  <select
                    value={snapshotFilters.projectId}
                    onChange={(e) => setSnapshotFilters((prev) => ({ ...prev, projectId: e.target.value }))}
                  >
                    <option value="">Tous les projets</option>
                    {snapshotProjects.map((project) => (
                      <option key={project.id_projet} value={project.id_projet}>
                        {project.display_label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Créé par…"
                    value={snapshotFilters.creator}
                    onChange={(e) => setSnapshotFilters((prev) => ({ ...prev, creator: e.target.value }))}
                  />
                  <select
                    value={snapshotFilters.type}
                    onChange={(e) => setSnapshotFilters((prev) => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="">Tous les types</option>
                    <option value="automatique">Automatique</option>
                    <option value="manuel">Manuel</option>
                    <option value="avant modification">Avant modification</option>
                    <option value="jalon">Jalon</option>
                  </select>
                  <label className="snapshot-checkbox">
                    <input
                      type="checkbox"
                      checked={snapshotFilters.withGeometryOnly}
                      onChange={(e) => setSnapshotFilters((prev) => ({ ...prev, withGeometryOnly: e.target.checked }))}
                    />
                    Avec géométrie
                  </label>
                </div>

                {filteredSnapshots.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <p>Aucun snapshot ne correspond aux filtres.</p>
                  </div>
                ) : (
                  <div className="snapshots-list">
                    {filteredSnapshots.map((snapshot) => {
                      const snapshotType = inferSnapshotType(snapshot);
                      const isExpanded = expandedSnapshotIds.includes(snapshot.id);
                      return (
                        <div key={snapshot.id} className="snapshot-item">
                          <div className="snapshot-header snapshot-header-strong">
                            <div className="snapshot-heading">
                              <div className="snapshot-title-row">
                                <span className="snapshot-projet">{snapshot.projetNom}</span>
                                <span className={`snapshot-type snapshot-type-${snapshotType.replace(/\s+/g, '-')}`}>
                                  {formatSnapshotTypeLabel(snapshotType)}
                                </span>
                                {snapshot.isCurrent && <span className="snapshot-current-badge">Courant</span>}
                              </div>
                              <div className="snapshot-subtitle-row">
                                <span className="snapshot-version">v{snapshot.versionNumber}</span>
                                <span className="snapshot-id">#{snapshot.id}</span>
                                <span className="snapshot-project-id">Projet {snapshot.idProjet}</span>
                              </div>
                            </div>
                            <div className="snapshot-meta snapshot-meta-compact">
                              <span>Créé par: {snapshot.creator ? snapshot.creator.nomComplet : 'Système'}</span>
                              <span>Le: {formatDateTimeFr(snapshot.createdAt)}</span>
                            </div>
                          </div>

                          <div className="snapshot-description">
                            {snapshot.description || 'Snapshot sans description.'}
                          </div>

                          <div className="snapshot-badges-row">
                            <span className="snapshot-section-chip">👥 {snapshot.nbPorteurs} porteur(s)</span>
                            <span className="snapshot-section-chip">📋 {snapshot.nbSuivis} suivi(s)</span>
                            <span className="snapshot-section-chip">🏷️ {snapshot.nbThematiques} thématique(s)</span>
                            <span className="snapshot-section-chip">📄 {snapshot.nbDocuments} document(s)</span>
                            <span className="snapshot-section-chip">{snapshot.hasGeometry ? '📍 Géométrie présente' : '📍 Sans géométrie'}</span>
                          </div>

                          <div className="snapshot-summary-grid">
                            <div><strong>Nom figé :</strong> {snapshot.snapshotNomProjet || 'N/A'}</div>
                            <div><strong>Statut :</strong> {snapshot.snapshotStatutLabel || snapshot.snapshotStatutId || 'N/A'}</div>
                            <div><strong>Service :</strong> {snapshot.snapshotServiceLabel || snapshot.snapshotServiceId || 'N/A'}</div>
                            <div><strong>Référent :</strong> {snapshot.snapshotReferentDdt || 'N/A'}</div>
                          </div>

                          {isExpanded && (
                            <div className="snapshot-data">
                              <div className="snapshot-data-row">
                                <strong>Description du projet :</strong> {snapshot.rawProjectDescription || 'Aucune description'}
                              </div>
                              <div className="snapshot-data-row">
                                <strong>Date d’identification :</strong> {snapshot.snapshotDateIdentProjet ? formatDateTimeFr(snapshot.snapshotDateIdentProjet) : 'N/A'}
                              </div>
                              <div className="snapshot-data-row">
                                <strong>Sections capturées :</strong> {(snapshot.sectionsPresent || []).join(', ') || 'N/A'}
                              </div>
                              <div className="snapshot-data-counts">
                                {snapshot.snapshotProjetSignale && <span>🚨 Projet signalé</span>}
                                {snapshot.snapshotCharteAccueil && <span>🤝 Charte accueil</span>}
                                {snapshot.hasGeometry && <span>🗺️ Emprise sauvegardée</span>}
                                {snapshot.isCurrent && <span>✅ Snapshot courant</span>}
                              </div>
                            </div>
                          )}

                          <div className="snapshot-actions">
                            <button
                              type="button"
                              className="btn-preview"
                              onClick={() => toggleSnapshotExpanded(snapshot.id)}
                            >
                              {isExpanded ? 'Réduire' : 'Voir le détail'}
                            </button>
                            <button
                              onClick={() => handleRestore(snapshot.id)}
                              className="btn-restore"
                              disabled={isLoading}
                            >
                              🔄 Restaurer
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
          )}

          {/* Tab: Demandes de suppression */}
          {activeTab === 'deletion-requests' && (
              <DeletionRequestsTab
                  apiCall={async (endpoint, options = {}) => {
                    const token = localStorage.getItem('token');
                    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
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

          {/* Tab: Demandes d'archivage */}
          {activeTab === 'archive-requests' && (
              <DeletionRequestsTab
                  mode="archive"
                  apiCall={async (endpoint, options = {}) => {
                    const token = localStorage.getItem('token');
                    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
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

          {/* Tab: Projets supprimés */}
          {activeTab === 'deleted-projects' && !isLoading && (
              <div className="deleted-projects-container">
                <div className="deleted-projects-header">
                  <h2>♻️ Projets supprimés</h2>
                  <p>Liste des projets supprimés (soft delete). Vous pouvez les restaurer.</p>
                </div>

                {deletedProjects.length === 0 ? (
                    <div className="empty-state">
                      <p>Aucun projet supprimé</p>
                    </div>
                ) : (
                    <div className="deleted-projects-list">
                      <table className="admin-table">
                        <thead>
                        <tr>
                          <th>ID</th>
                          <th>Nom du projet</th>
                          <th>Statut</th>
                          <th>Supprimé le</th>
                          <th>Modifié par</th>
                          <th>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {deletedProjects.map((project) => (
                            <tr key={project.id_projet}>
                              <td>{project.id_projet}</td>
                              <td>
                                <strong>{project.nom_projet || 'Sans nom'}</strong>
                              </td>
                              <td>
                                    <span className="status-badge">
                                      {project.statut_projet_enum?.libelle || 'N/A'}
                                    </span>
                              </td>
                              <td>
                                {project.deleted_at
                                    ? formatDateTimeFr(project.deleted_at)
                                    : 'N/A'}
                              </td>
                              <td>
                                {project.updater
                                    ? `${project.updater.prenom || ''} ${project.updater.nom || ''}`.trim() || project.updater.username
                                    : 'N/A'}
                              </td>
                              <td>
                                <button
                                    onClick={() => handleRestoreProject(project.id_projet, project.nom_projet)}
                                    className="btn-action btn-restore"
                                    title="Restaurer ce projet"
                                >
                                  ♻️ Restaurer
                                </button>
                              </td>
                            </tr>
                        ))}
                        </tbody>
                      </table>
                    </div>
                )}
              </div>
          )}

          {/* Tab: Versions de Sections */}
          {activeTab === 'section-versions' && (
              <SectionVersionsTab
                  apiCall={async (endpoint, options = {}) => {
                    const token = localStorage.getItem('token');
                    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
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
