// frontend/src/components/admin/SectionVersionsTab.js
/**
 * Composant admin pour gérer les versions de sections
 * - Visualiser les versions par projet/section/utilisateur
 * - Restaurer une version spécifique
 * - Déclencher le nettoyage automatique
 */

import React, { useState, useEffect } from 'react';
import '../../pages/Admin/AdminPage.css';

export default function SectionVersionsTab({ apiCall }) {
  const [versions, setVersions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [restoreReason, setRestoreReason] = useState('');
  const [restoring, setRestoring] = useState(false);

  // Listes pour les dropdowns
  const [projets, setProjets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  // Filtres
  const [filters, setFilters] = useState({
    idProjet: '',
    userId: '',
    sectionName: '',
    limit: 50
  });

  const sectionLabels = {
    'projet_info': '📋 Informations du projet',
    'porteurs': '👥 Porteurs',
    'suivis': '📝 Suivis',
    'thematiques': '🎯 Thématiques',
    'documents': '📄 Documents',
    'geometrie': '🗺️ Géométrie'
  };

  // Charger les dropdowns (projets et users)
  const loadDropdowns = async () => {
    try {
      setLoadingDropdowns(true);

      console.log('🔄 Chargement des dropdowns...');

      const [projetsResult, usersResult] = await Promise.allSettled([
        apiCall('/admin/projets'),
        apiCall('/admin/users?active=true')
      ]);

      let projetsList = [];
      let usersList = [];

      // Chargement des projets (indépendant)
      if (projetsResult.status === 'fulfilled' && projetsResult.value?.success) {
        projetsList = Array.isArray(projetsResult.value.data) ? projetsResult.value.data : [];
      } else {
        console.error('❌ Erreur projets admin:', projetsResult.status === 'rejected' ? projetsResult.reason : projetsResult.value?.message);
      }

      // Fallback projets via endpoint public si nécessaire
      if (projetsList.length === 0) {
        try {
          const projetsFallback = await apiCall('/projets');
          if (Array.isArray(projetsFallback)) {
            projetsList = projetsFallback.map((projet) => ({
              id_projet: projet.id_projet,
              nom_projet: projet.nom_projet || 'Sans nom',
              display_label: `${projet.id_projet} - ${projet.nom_projet || 'Sans nom'}`
            }));
            console.log(`✅ Fallback projets utilisé (${projetsList.length})`);
          }
        } catch (fallbackErr) {
          console.error('❌ Fallback projets échoué:', fallbackErr);
        }
      }

      // Chargement des utilisateurs (indépendant)
      if (usersResult.status === 'fulfilled' && usersResult.value?.success) {
        usersList = Array.isArray(usersResult.value.data) ? usersResult.value.data : [];
      } else {
        console.error('❌ Erreur users admin:', usersResult.status === 'rejected' ? usersResult.reason : usersResult.value?.message);
      }

      // Fallback users via statistiques de versions si nécessaire
      if (usersList.length === 0) {
        try {
          const versionsFallback = await apiCall('/admin/section-versions?limit=200');
          if (versionsFallback?.success && Array.isArray(versionsFallback?.stats?.par_utilisateur)) {
            usersList = versionsFallback.stats.par_utilisateur.map((user) => ({
              id_user: user.user_id,
              username: user.username || `user-${user.user_id}`,
              nom_complet: user.nom_complet || user.username || `Utilisateur ${user.user_id}`
            }));
            console.log(`✅ Fallback users utilisé (${usersList.length})`);
          }
        } catch (fallbackErr) {
          console.error('❌ Fallback users échoué:', fallbackErr);
        }
      }

      const projetsNormalises = projetsList.map(projet => ({
        ...projet,
        display_label: projet.display_label || `${projet.id_projet} - ${projet.nom_projet || 'Sans nom'}`
      }));

      setProjets(projetsNormalises);
      setUsers(usersList);

      console.log(`✅ ${projetsNormalises.length} projets chargés`);
      console.log(`✅ ${usersList.length} utilisateurs chargés`);
      console.log('📋 Projets disponibles:', projetsNormalises.map(p => ({ id: p.id_projet, label: p.display_label })));
    } catch (err) {
      console.error('❌ Erreur chargement dropdowns:', err);
    } finally {
      setLoadingDropdowns(false);
    }
  };

  // Charger les versions
  const loadVersions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.idProjet) params.append('idProjet', filters.idProjet);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.sectionName) params.append('sectionName', filters.sectionName);
      params.append('limit', filters.limit);

      console.log('🔍 Chargement des versions avec filtres:', {
        idProjet: filters.idProjet || 'Tous',
        userId: filters.userId || 'Tous',
        sectionName: filters.sectionName || 'Toutes',
        limit: filters.limit
      });

      const response = await apiCall(`/admin/section-versions?${params.toString()}`);

      console.log('📡 Réponse API versions:', response);

      if (response.success) {
        setVersions(response.data);
        setStats(response.stats);
        console.log(`✅ ${response.data.length} versions chargées`);
        if (filters.idProjet) {
          const versionsForProject = response.data.filter(v => v.id_projet === filters.idProjet);
          console.log(`📊 Versions pour le projet ${filters.idProjet}:`, versionsForProject.length);
        }
      } else {
        setError(response.message || 'Erreur lors du chargement des versions');
        console.error('❌ Erreur:', response.message);
      }
    } catch (err) {
      setError('Erreur réseau: ' + err.message);
      console.error('❌ Erreur réseau:', err);
    } finally {
      setLoading(false);
    }
  };

  // Charger au montage
  useEffect(() => {
    loadDropdowns();
  }, []);

  // Charger quand les filtres changent
  useEffect(() => {
    if (!loadingDropdowns) {
      console.log('🔄 Filtres changés, rechargement des versions...', filters);
      loadVersions();
    }
  }, [filters, loadingDropdowns]);

  // Afficher le modal de preview
  const handleShowPreview = (version) => {
    setSelectedVersion(version);
    setShowPreviewModal(true);
  };

  // Afficher le modal de restauration
  const handleShowRestore = (version) => {
    setSelectedVersion(version);
    setShowRestoreModal(true);
    setRestoreReason('');
  };

  // Confirmer la restauration
  const handleConfirmRestore = async () => {
    if (!selectedVersion) return;

    try {
      setRestoring(true);

      const response = await apiCall('/section-versions/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idVersion: selectedVersion.id_version,
          reason: restoreReason || 'Restauration manuelle par admin'
        })
      });

      if (response.success) {
        alert(`✅ Section ${selectedVersion.section_name} restaurée avec succès !`);
        setShowRestoreModal(false);
        setSelectedVersion(null);
        loadVersions(); // Recharger
      } else {
        alert(`❌ Erreur: ${response.message}`);
      }
    } catch (err) {
      alert(`❌ Erreur réseau: ${err.message}`);
    } finally {
      setRestoring(false);
    }
  };

  // Déclencher le nettoyage
  const handleCleanup = async () => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Voulez-vous lancer le nettoyage automatique ? (Supprime les versions de +15 jours et garde max 10 versions par section/utilisateur)')) {
      return;
    }

    try {
      const response = await apiCall('/admin/section-versions', {
        method: 'DELETE'
      });

      if (response.success) {
        const diagnostics = response.data?.diagnostics || {};
        const policy = response.data?.policy || {};
        alert(
          `✅ Nettoyage effectué:\n` +
          `- ${response.data.deleted_old_versions} versions anciennes supprimées\n` +
          `- ${response.data.deleted_excess_versions} versions en excès supprimées\n` +
          `- ${response.data.remaining_versions} versions restantes\n` +
          `\n` +
          `Règle appliquée:\n` +
          `- max ${policy.max_versions_per_user_section ?? 10} versions par section/utilisateur\n` +
          `- rétention ${policy.retention_days ?? 15} jours\n` +
          `\n` +
          `Diagnostic:\n` +
          `- groupes > limite avant nettoyage: ${diagnostics.groups_over_limit_before ?? 0}\n` +
          `- groupes > limite après nettoyage: ${diagnostics.groups_over_limit_after ?? 0}`
        );
        loadVersions(); // Recharger
      } else {
        alert(`❌ Erreur: ${response.message}`);
      }
    } catch (err) {
      alert(`❌ Erreur réseau: ${err.message}`);
    }
  };

  // Formater la date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="section-versions-container">
      {/* En-tête avec filtres */}
      <div className="admin-header">
        <div>
          <h2>🔄 Versions de Sections</h2>
          <p className="admin-subtitle">
            Sauvegarde et restauration granulaire par section (max 10 versions/section/utilisateur, rétention 15 jours)
          </p>
        </div>
        <button className="btn-cleanup" onClick={handleCleanup}>
          🧹 Lancer le nettoyage
        </button>
      </div>

      {/* Filtres */}
      <div className="filters-section">
        <div className="filter-group">
          <label>📁 Projet:</label>
          <select
            value={filters.idProjet}
            onChange={(e) => {
              const value = e.target.value;
              console.log('🔄 Changement de projet sélectionné:', value);
              setFilters({ ...filters, idProjet: value });
            }}
            disabled={loadingDropdowns}
          >
            <option value="">Tous les projets</option>
            {projets.map(projet => (
              <option key={projet.id_projet} value={projet.id_projet}>
                {projet.display_label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>📦 Section:</label>
          <select
            value={filters.sectionName}
            onChange={(e) => setFilters({ ...filters, sectionName: e.target.value })}
          >
            <option value="">Toutes les sections</option>
            {Object.entries(sectionLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>👤 Utilisateur:</label>
          <select
            value={filters.userId}
            onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
            disabled={loadingDropdowns}
          >
            <option value="">Tous les utilisateurs</option>
            {users.map(user => (
              <option key={user.id_user} value={user.id_user}>
                {user.nom_complet} ({user.username})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>📊 Limite:</label>
          <select
            value={filters.limit}
            onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
          </select>
        </div>
      </div>

      {/* Statistiques */}
      {stats && (
        <div className="stats-section">
          <div className="stat-card">
            <h3>📊 Total</h3>
            <p className="stat-value">{stats.total}</p>
            <p className="stat-label">versions</p>
          </div>
          <div className="stat-card">
            <h3>📦 Par section</h3>
            {stats.par_section?.map(s => (
              <p key={s.section_name}>
                {sectionLabels[s.section_name] || s.section_name}: <strong>{s.count}</strong>
              </p>
            ))}
          </div>
          <div className="stat-card">
            <h3>👥 Top utilisateurs</h3>
            {stats.par_utilisateur?.slice(0, 5).map(u => (
              <p key={u.user_id}>
                {u.nom_complet}: <strong>{u.count}</strong>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Chargement */}
      {loading && <div className="loading">⏳ Chargement des versions...</div>}

      {/* Erreur */}
      {error && <div className="error-message">❌ {error}</div>}

      {/* Liste des versions */}
      {!loading && !error && (
        <div className="versions-table-container">
          {versions.length === 0 ? (
            <div className="empty-state">
              <p>Aucune version trouvée</p>
            </div>
          ) : (
            <table className="versions-table">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Projet</th>
                  <th>Section</th>
                  <th>Utilisateur</th>
                  <th>Date</th>
                  <th>Actuelle</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {versions.map(v => (
                  <tr key={v.id_version} className={v.is_current ? 'current-version' : ''}>
                    <td>#{v.version_number}</td>
                    <td>
                      <span className="projet-id">{v.id_projet}</span>
                      <br />
                      <small>{v.projet_nom}</small>
                    </td>
                    <td>{sectionLabels[v.section_name] || v.section_name}</td>
                    <td>{v.created_by?.nom_complet || 'N/A'}</td>
                    <td>{formatDate(v.snapshot_date)}</td>
                    <td>
                      {v.is_current ? <span className="badge badge-success">✓ Actuelle</span> : '-'}
                    </td>
                    <td className="description-cell">{v.description || '-'}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-preview"
                          onClick={() => handleShowPreview(v)}
                          title="Voir les données"
                        >
                          👁️
                        </button>
                        <button
                          className="btn-restore"
                          onClick={() => handleShowRestore(v)}
                          title="Restaurer cette version"
                        >
                          🔄
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal de preview des données */}
      {showPreviewModal && selectedVersion && (
        <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <h3>👁️ Aperçu des données - Version #{selectedVersion.version_number}</h3>
            <div className="modal-body">
              <div className="preview-header">
                <p><strong>Projet:</strong> {selectedVersion.projet_nom} ({selectedVersion.id_projet})</p>
                <p><strong>Section:</strong> {sectionLabels[selectedVersion.section_name]}</p>
                <p><strong>Date:</strong> {formatDate(selectedVersion.snapshot_date)}</p>
                <p><strong>Créée par:</strong> {selectedVersion.created_by?.nom_complet}</p>
              </div>

              <div className="preview-data">
                <h4>📦 Contenu de la version:</h4>
                <pre className="json-preview">
                  {JSON.stringify(selectedVersion.section_data, null, 2)}
                </pre>
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowPreviewModal(false)}
              >
                Fermer
              </button>
              <button
                className="btn-confirm"
                onClick={() => {
                  setShowPreviewModal(false);
                  handleShowRestore(selectedVersion);
                }}
              >
                🔄 Restaurer cette version
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de restauration */}
      {showRestoreModal && selectedVersion && (
        <div className="modal-overlay" onClick={() => setShowRestoreModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>🔄 Confirmer la restauration</h3>
            <div className="modal-body">
              <p><strong>Projet:</strong> {selectedVersion.projet_nom} ({selectedVersion.id_projet})</p>
              <p><strong>Section:</strong> {sectionLabels[selectedVersion.section_name]}</p>
              <p><strong>Version:</strong> #{selectedVersion.version_number}</p>
              <p><strong>Date:</strong> {formatDate(selectedVersion.snapshot_date)}</p>
              <p><strong>Créée par:</strong> {selectedVersion.created_by?.nom_complet}</p>

              <div className="form-group">
                <label>Raison de la restauration (optionnel):</label>
                <textarea
                  value={restoreReason}
                  onChange={(e) => setRestoreReason(e.target.value)}
                  placeholder="Ex: Correction d'une erreur de saisie"
                  rows="3"
                />
              </div>

              <div className="warning-box">
                ⚠️ <strong>Attention:</strong> Cette action va remplacer les données actuelles de cette section par celles de la version sélectionnée.
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowRestoreModal(false)}
                disabled={restoring}
              >
                Annuler
              </button>
              <button
                className="btn-confirm"
                onClick={handleConfirmRestore}
                disabled={restoring}
              >
                {restoring ? '⏳ Restauration...' : '✓ Confirmer la restauration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
