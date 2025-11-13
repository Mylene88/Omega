// frontend/src/components/admin/SectionVersionsTab.js
/**
 * Composant admin pour gérer les versions de sections
 * - Visualiser les versions par projet/section/utilisateur
 * - Restaurer une version spécifique
 * - Déclencher le nettoyage automatique
 */

import React, { useState, useEffect } from 'react';
import '../../pages/Admin/AdminPageEnhanced.css';

export default function SectionVersionsTab({ apiCall }) {
  const [versions, setVersions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreReason, setRestoreReason] = useState('');
  const [restoring, setRestoring] = useState(false);

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

      const response = await apiCall(`/admin/section-versions?${params.toString()}`);

      if (response.success) {
        setVersions(response.data);
        setStats(response.stats);
      } else {
        setError(response.message || 'Erreur lors du chargement des versions');
      }
    } catch (err) {
      setError('Erreur réseau: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Charger au montage et quand les filtres changent
  useEffect(() => {
    loadVersions();
  }, [filters]);

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
    if (!confirm('Voulez-vous lancer le nettoyage automatique ? (Supprime les versions de +15 jours et garde max 10 versions par section/utilisateur)')) {
      return;
    }

    try {
      const response = await apiCall('/admin/section-versions', {
        method: 'DELETE'
      });

      if (response.success) {
        alert(`✅ Nettoyage effectué:\n- ${response.data.deleted_old_versions} versions anciennes supprimées\n- ${response.data.deleted_excess_versions} versions en excès supprimées\n- ${response.data.remaining_versions} versions restantes`);
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
          <label>ID Projet:</label>
          <input
            type="text"
            placeholder="Ex: PROJ001"
            value={filters.idProjet}
            onChange={(e) => setFilters({ ...filters, idProjet: e.target.value })}
          />
        </div>

        <div className="filter-group">
          <label>Section:</label>
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
          <label>ID Utilisateur:</label>
          <input
            type="text"
            placeholder="Ex: 1"
            value={filters.userId}
            onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
          />
        </div>

        <div className="filter-group">
          <label>Limite:</label>
          <select
            value={filters.limit}
            onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
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
                      <button
                        className="btn-restore"
                        onClick={() => handleShowRestore(v)}
                        title="Restaurer cette version"
                      >
                        🔄 Restaurer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
