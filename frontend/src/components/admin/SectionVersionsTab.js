// frontend/src/components/admin/SectionVersionsTab.js
/**
 * Composant admin pour gérer les versions de sections
 * - Visualiser les versions par projet/section/utilisateur
 * - Restaurer une version spécifique
 * - Déclencher le nettoyage automatique
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import '../../pages/Admin/AdminPage.css';

const SECTION_CONFIG = {
  projet_info: { label: 'Informations du projet', icon: '📋' },
  porteurs: { label: 'Porteurs', icon: '👥' },
  suivis: { label: 'Suivis', icon: '📝' },
  thematiques: { label: 'Thématiques', icon: '🎯' },
  documents: { label: 'Documents', icon: '📄' },
  geometrie: { label: 'Géométrie', icon: '🗺️' }
};

function getSectionDisplay(sectionName) {
  return SECTION_CONFIG[sectionName] || { label: sectionName, icon: '📦' };
}

function getSummaryItems(version) {
  const data = version?.section_data;
  if (!data) return [];

  if (Array.isArray(data)) {
    const count = data.length;
    if (version.section_name === 'porteurs') return [`${count} porteur${count > 1 ? 's' : ''}`];
    if (version.section_name === 'suivis') return [`${count} suivi${count > 1 ? 's' : ''}`];
    if (version.section_name === 'thematiques') return [`${count} thématique${count > 1 ? 's' : ''}`];
    if (version.section_name === 'documents') return [`${count} document${count > 1 ? 's' : ''}`];
    return [`${count} élément${count > 1 ? 's' : ''}`];
  }

  if (typeof data === 'object') {
    if (version.section_name === 'projet_info') {
      const items = [];
      if (data.nom_projet) items.push(`Nom: ${data.nom_projet}`);
      if (data.statut_projet_id) items.push(`Statut ID: ${data.statut_projet_id}`);
      if (data.service_id) items.push(`Service ID: ${data.service_id}`);
      if (data.referent_ddt) items.push(`Référent: ${data.referent_ddt}`);
      return items.slice(0, 3);
    }

    if (version.section_name === 'geometrie') {
      const items = [];
      if (Array.isArray(data.codes_insee) && data.codes_insee.length > 0) {
        items.push(`${data.codes_insee.length} code${data.codes_insee.length > 1 ? 's' : ''} INSEE`);
      }
      if (Array.isArray(data.communes_traversees) && data.communes_traversees.length > 0) {
        items.push(`${data.communes_traversees.length} commune${data.communes_traversees.length > 1 ? 's' : ''}`);
      }
      if (data.type) {
        items.push(`Type: ${data.type}`);
      }
      return items.slice(0, 3);
    }

    return [`${Object.keys(data).length} champ${Object.keys(data).length > 1 ? 's' : ''}`];
  }

  return [];
}

function normalizeSearchValue(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function SectionVersionsTab({ apiCall }) {
  const [versions, setVersions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreReason, setRestoreReason] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [expandedVersionIds, setExpandedVersionIds] = useState([]);
  const [compareResults, setCompareResults] = useState({});
  const [comparingVersionIds, setComparingVersionIds] = useState([]);
  const [expandedProjectIds, setExpandedProjectIds] = useState([]);
  const [expandedSectionKeys, setExpandedSectionKeys] = useState([]);

  const [projets, setProjets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  const [filters, setFilters] = useState({
    idProjet: '',
    userId: '',
    sectionName: '',
    query: '',
    currentOnly: false,
    limit: 50
  });

  const loadDropdowns = useCallback(async () => {
    try {
      setLoadingDropdowns(true);

      const [projetsResult, usersResult] = await Promise.allSettled([
        apiCall('/admin/projets'),
        apiCall('/admin/users?active=true')
      ]);

      let projetsList = [];
      let usersList = [];

      if (projetsResult.status === 'fulfilled' && projetsResult.value?.success) {
        projetsList = Array.isArray(projetsResult.value.data) ? projetsResult.value.data : [];
      }

      if (projetsList.length === 0) {
        try {
          const projetsFallback = await apiCall('/projets');
          if (Array.isArray(projetsFallback)) {
            projetsList = projetsFallback.map((projet) => ({
              id_projet: projet.id_projet,
              nom_projet: projet.nom_projet || 'Sans nom',
              display_label: `${projet.id_projet} - ${projet.nom_projet || 'Sans nom'}`
            }));
          }
        } catch (fallbackErr) {
          console.error('❌ Fallback projets échoué:', fallbackErr);
        }
      }

      if (usersResult.status === 'fulfilled' && usersResult.value?.success) {
        usersList = Array.isArray(usersResult.value.data) ? usersResult.value.data : [];
      }

      if (usersList.length === 0) {
        try {
          const versionsFallback = await apiCall('/admin/section-versions?limit=200');
          if (versionsFallback?.success && Array.isArray(versionsFallback?.stats?.par_utilisateur)) {
            usersList = versionsFallback.stats.par_utilisateur.map((user) => ({
              id_user: user.user_id,
              username: user.username || `user-${user.user_id}`,
              nom_complet: user.nom_complet || user.username || `Utilisateur ${user.user_id}`
            }));
          }
        } catch (fallbackErr) {
          console.error('❌ Fallback users échoué:', fallbackErr);
        }
      }

      setProjets(
        projetsList.map((projet) => ({
          ...projet,
          display_label: projet.display_label || `${projet.id_projet} - ${projet.nom_projet || 'Sans nom'}`
        }))
      );
      setUsers(usersList);
    } catch (err) {
      console.error('❌ Erreur chargement dropdowns:', err);
    } finally {
      setLoadingDropdowns(false);
    }
  }, [apiCall]);

  const loadVersions = useCallback(async () => {
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
        setVersions(Array.isArray(response.data) ? response.data : []);
        setStats(response.stats || null);
      } else {
        setError(response.message || 'Erreur lors du chargement des versions');
      }
    } catch (err) {
      setError('Erreur réseau: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [apiCall, filters.idProjet, filters.limit, filters.sectionName, filters.userId]);

  useEffect(() => {
    loadDropdowns();
  }, [loadDropdowns]);

  useEffect(() => {
    if (!loadingDropdowns) {
      loadVersions();
    }
  }, [loadVersions, loadingDropdowns]);

  const filteredVersions = useMemo(() => {
    const query = normalizeSearchValue(filters.query);
    return versions.filter((version) => {
      if (filters.currentOnly && !version.is_current) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = normalizeSearchValue([
        version.id_projet,
        version.projet_nom,
        version.section_name,
        getSectionDisplay(version.section_name).label,
        version.description,
        version.created_by?.nom_complet,
        version.created_by?.username,
        ...getSummaryItems(version)
      ].join(' '));

      return haystack.includes(query);
    });
  }, [filters.currentOnly, filters.query, versions]);

  const quickStats = useMemo(() => {
    const currentCount = filteredVersions.filter((version) => version.is_current).length;
    const uniqueProjects = new Set(filteredVersions.map((version) => version.id_projet)).size;
    const lastSevenDays = filteredVersions.filter((version) => {
      const versionDate = version.snapshot_date ? new Date(version.snapshot_date) : null;
      if (!versionDate) return false;
      return Date.now() - versionDate.getTime() <= 7 * 24 * 60 * 60 * 1000;
    }).length;

    return {
      total: filteredVersions.length,
      current: currentCount,
      projects: uniqueProjects,
      recent: lastSevenDays
    };
  }, [filteredVersions]);

  const topSectionStats = useMemo(() => {
    if (!stats?.par_section) return [];
    return stats.par_section
      .slice()
      .sort((a, b) => Number(b.count) - Number(a.count))
      .slice(0, 4);
  }, [stats]);

  const topUserStats = useMemo(() => {
    if (!stats?.par_utilisateur) return [];
    return stats.par_utilisateur.slice(0, 4);
  }, [stats]);

  const groupedProjects = useMemo(() => {
    const grouped = new Map();

    filteredVersions.forEach((version) => {
      if (!grouped.has(version.id_projet)) {
        grouped.set(version.id_projet, {
          idProjet: version.id_projet,
          projetNom: version.projet_nom || 'Projet sans nom',
          versions: [],
          sections: new Map(),
          latestDate: version.snapshot_date || null
        });
      }

      const projectGroup = grouped.get(version.id_projet);
      projectGroup.versions.push(version);

      const currentLatest = projectGroup.latestDate ? new Date(projectGroup.latestDate).getTime() : 0;
      const candidateLatest = version.snapshot_date ? new Date(version.snapshot_date).getTime() : 0;
      if (candidateLatest > currentLatest) {
        projectGroup.latestDate = version.snapshot_date;
      }

      if (!projectGroup.sections.has(version.section_name)) {
        projectGroup.sections.set(version.section_name, []);
      }
      projectGroup.sections.get(version.section_name).push(version);
    });

    return Array.from(grouped.values())
      .map((projectGroup) => ({
        ...projectGroup,
        sections: Array.from(projectGroup.sections.entries())
          .map(([sectionName, sectionVersions]) => ({
            sectionName,
            sectionDisplay: getSectionDisplay(sectionName),
            versions: sectionVersions.sort((a, b) => new Date(b.snapshot_date || 0) - new Date(a.snapshot_date || 0)),
            currentCount: sectionVersions.filter((version) => version.is_current).length
          }))
          .sort((a, b) => a.sectionDisplay.label.localeCompare(b.sectionDisplay.label, 'fr')),
        currentCount: projectGroup.versions.filter((version) => version.is_current).length
      }))
      .sort((a, b) => new Date(b.latestDate || 0) - new Date(a.latestDate || 0));
  }, [filteredVersions]);

  const toggleExpanded = (idVersion) => {
    setExpandedVersionIds((current) => (
      current.includes(idVersion)
        ? current.filter((id) => id !== idVersion)
        : [...current, idVersion]
    ));
  };

  const toggleProjectExpanded = (idProjet) => {
    setExpandedProjectIds((current) => (
      current.includes(idProjet)
        ? current.filter((id) => id !== idProjet)
        : [...current, idProjet]
    ));
  };

  const toggleSectionExpanded = (sectionKey) => {
    setExpandedSectionKeys((current) => (
      current.includes(sectionKey)
        ? current.filter((key) => key !== sectionKey)
        : [...current, sectionKey]
    ));
  };

  const resetFilters = () => {
    setFilters({
      idProjet: '',
      userId: '',
      sectionName: '',
      query: '',
      currentOnly: false,
      limit: 50
    });
  };

  const handleShowRestore = (version) => {
    setSelectedVersion(version);
    setShowRestoreModal(true);
    setRestoreReason('');
  };

  const handleCompareWithCurrent = async (version) => {
    try {
      const sectionKey = `${version.id_projet}::${version.section_name}`;
      setExpandedProjectIds((current) => (
        current.includes(version.id_projet)
          ? current
          : [...current, version.id_projet]
      ));
      setExpandedSectionKeys((current) => (
        current.includes(sectionKey)
          ? current
          : [...current, sectionKey]
      ));
      setExpandedVersionIds((current) => (
        current.includes(version.id_version)
          ? current
          : [...current, version.id_version]
      ));
      setComparingVersionIds((current) => [...current, version.id_version]);
      const response = await apiCall(`/admin/section-versions/compare?idVersion=${version.id_version}`);

      if (response.success) {
        setCompareResults((current) => ({
          ...current,
          [version.id_version]: response.data
        }));
      } else {
        setNotice({
          type: 'error',
          message: response.message || 'Impossible de comparer cette version'
        });
      }
    } catch (err) {
      setNotice({
        type: 'error',
        message: `Erreur réseau: ${err.message}`
      });
    } finally {
      setComparingVersionIds((current) => current.filter((id) => id !== version.id_version));
    }
  };

  const handleConfirmRestore = async () => {
    if (!selectedVersion) return;

    try {
      setRestoring(true);
      setNotice(null);

      const response = await apiCall('/section-versions/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idVersion: selectedVersion.id_version,
          reason: restoreReason || 'Restauration manuelle par admin'
        })
      });

      if (response.success) {
        setNotice({
          type: 'success',
          message: `Section ${getSectionDisplay(selectedVersion.section_name).label} restaurée pour le projet ${selectedVersion.id_projet}.`
        });
        setShowRestoreModal(false);
        setSelectedVersion(null);
        loadVersions();
      } else {
        setNotice({
          type: 'error',
          message: response.message || 'Échec de la restauration'
        });
      }
    } catch (err) {
      setNotice({
        type: 'error',
        message: `Erreur réseau: ${err.message}`
      });
    } finally {
      setRestoring(false);
    }
  };

  const handleCleanup = async () => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Lancer le nettoyage automatique des versions anciennes et en excès ?')) {
      return;
    }

    try {
      setNotice(null);
      const response = await apiCall('/admin/section-versions', {
        method: 'DELETE'
      });

      if (response.success) {
        const diagnostics = response.data?.diagnostics || {};
        const policy = response.data?.policy || {};
        setNotice({
          type: 'success',
          message: `Nettoyage terminé: ${response.data.deleted_old_versions} anciennes, ${response.data.deleted_excess_versions} en excès supprimées. Règle: max ${policy.max_versions_per_user_section ?? 10} versions par section/utilisateur, rétention ${policy.retention_days ?? 15} jours. Groupes encore au-dessus de la limite: ${diagnostics.groups_over_limit_after ?? 0}.`
        });
        loadVersions();
      } else {
        setNotice({
          type: 'error',
          message: response.message || 'Erreur lors du nettoyage'
        });
      }
    } catch (err) {
      setNotice({
        type: 'error',
        message: `Erreur réseau: ${err.message}`
      });
    }
  };

  return (
    <div className="section-versions-container">
      <div className="admin-header">
        <div>
          <h2>Versions de sections</h2>
          <p className="admin-subtitle">
            Retrouvez les sauvegardes par section, voyez rapidement ce qu’elles contiennent, puis restaurez la bonne version au bon moment.
          </p>
        </div>
        <div className="section-versions-header-actions">
          <button className="btn-refresh" onClick={loadVersions} disabled={loading}>
            Actualiser
          </button>
          <button className="btn-cleanup" onClick={handleCleanup}>
            Nettoyer l’historique
          </button>
        </div>
      </div>

      {notice && (
        <div className={notice.type === 'success' ? 'success-banner' : 'error-message'}>
          <span>{notice.type === 'success' ? '✅' : '❌'} {notice.message}</span>
          <button onClick={() => setNotice(null)} aria-label="Fermer le message">×</button>
        </div>
      )}

      <div className="section-versions-kpis">
        <div className="section-version-kpi-card">
          <span className="section-version-kpi-label">Versions affichées</span>
          <strong className="section-version-kpi-value">{quickStats.total}</strong>
        </div>
        <div className="section-version-kpi-card">
          <span className="section-version-kpi-label">Versions actuelles</span>
          <strong className="section-version-kpi-value">{quickStats.current}</strong>
        </div>
        <div className="section-version-kpi-card">
          <span className="section-version-kpi-label">Projets concernés</span>
          <strong className="section-version-kpi-value">{quickStats.projects}</strong>
        </div>
        <div className="section-version-kpi-card">
          <span className="section-version-kpi-label">Créées sur 7 jours</span>
          <strong className="section-version-kpi-value">{quickStats.recent}</strong>
        </div>
      </div>

      <div className="section-versions-filters">
        <div className="section-version-filter">
          <label htmlFor="section-version-search">Recherche</label>
          <input
            id="section-version-search"
            type="text"
            value={filters.query}
            onChange={(e) => setFilters((current) => ({ ...current, query: e.target.value }))}
            placeholder="Projet, section, utilisateur, description..."
          />
        </div>

        <div className="section-version-filter">
          <label htmlFor="section-version-project">Projet</label>
          <select
            id="section-version-project"
            value={filters.idProjet}
            onChange={(e) => setFilters((current) => ({ ...current, idProjet: e.target.value }))}
            disabled={loadingDropdowns}
          >
            <option value="">Tous les projets</option>
            {projets.map((projet) => (
              <option key={projet.id_projet} value={projet.id_projet}>
                {projet.display_label}
              </option>
            ))}
          </select>
        </div>

        <div className="section-version-filter">
          <label htmlFor="section-version-section">Section</label>
          <select
            id="section-version-section"
            value={filters.sectionName}
            onChange={(e) => setFilters((current) => ({ ...current, sectionName: e.target.value }))}
          >
            <option value="">Toutes les sections</option>
            {Object.entries(SECTION_CONFIG).map(([key, value]) => (
              <option key={key} value={key}>{value.label}</option>
            ))}
          </select>
        </div>

        <div className="section-version-filter">
          <label htmlFor="section-version-user">Utilisateur</label>
          <select
            id="section-version-user"
            value={filters.userId}
            onChange={(e) => setFilters((current) => ({ ...current, userId: e.target.value }))}
            disabled={loadingDropdowns}
          >
            <option value="">Tous les utilisateurs</option>
            {users.map((user) => (
              <option key={user.id_user} value={user.id_user}>
                {user.nom_complet} ({user.username})
              </option>
            ))}
          </select>
        </div>

        <div className="section-version-filter">
          <label htmlFor="section-version-limit">Limite</label>
          <select
            id="section-version-limit"
            value={filters.limit}
            onChange={(e) => setFilters((current) => ({ ...current, limit: parseInt(e.target.value, 10) }))}
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
          </select>
        </div>

        <label className="snapshot-checkbox section-version-toggle">
          <input
            type="checkbox"
            checked={filters.currentOnly}
            onChange={(e) => setFilters((current) => ({ ...current, currentOnly: e.target.checked }))}
          />
          Voir seulement la version actuelle
        </label>

        <button className="btn-secondary" onClick={resetFilters}>
          Réinitialiser les filtres
        </button>
      </div>

      {(topSectionStats.length > 0 || topUserStats.length > 0) && (
        <div className="section-versions-insights">
          {topSectionStats.length > 0 && (
            <div className="section-versions-insight-card">
              <h3>Sections les plus versionnées</h3>
              <div className="section-versions-mini-list">
                {topSectionStats.map((item) => (
                  <div key={item.section_name} className="section-versions-mini-row">
                    <span>{getSectionDisplay(item.section_name).label}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {topUserStats.length > 0 && (
            <div className="section-versions-insight-card">
              <h3>Utilisateurs les plus actifs</h3>
              <div className="section-versions-mini-list">
                {topUserStats.map((item) => (
                  <div key={item.user_id} className="section-versions-mini-row">
                    <span>{item.nom_complet || item.username || `Utilisateur ${item.user_id}`}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {loading && <div className="loading">Chargement des versions...</div>}
      {error && <div className="error-message">❌ {error}</div>}

      {!loading && !error && (
        <div className="section-versions-list">
          {groupedProjects.length === 0 ? (
            <div className="empty-state">
              <p>Aucune version ne correspond aux filtres actuels.</p>
            </div>
          ) : (
            groupedProjects.map((projectGroup) => {
              const projectExpanded = expandedProjectIds.includes(projectGroup.idProjet);

              return (
                <section key={projectGroup.idProjet} className="section-version-project-card">
                  <button
                    type="button"
                    className="section-version-project-header"
                    onClick={() => toggleProjectExpanded(projectGroup.idProjet)}
                  >
                    <div className="section-version-project-title">
                      <h3>{projectGroup.projetNom}</h3>
                      <p>{projectGroup.idProjet}</p>
                    </div>
                    <div className="section-version-project-meta">
                      <span className="snapshot-section-chip">{projectGroup.sections.length} section{projectGroup.sections.length > 1 ? 's' : ''}</span>
                      <span className="snapshot-section-chip">{projectGroup.versions.length} version{projectGroup.versions.length > 1 ? 's' : ''}</span>
                      {projectGroup.currentCount > 0 && (
                        <span className="snapshot-current-badge">{projectGroup.currentCount} actuelle{projectGroup.currentCount > 1 ? 's' : ''}</span>
                      )}
                      <span className="section-version-date">
                        Dernière: {formatDate(projectGroup.latestDate)}
                      </span>
                      <span className="section-version-project-toggle">{projectExpanded ? 'Masquer' : 'Ouvrir'}</span>
                    </div>
                  </button>

                  {projectExpanded && (
                    <div className="section-version-project-body">
                      {projectGroup.sections.map((sectionGroup) => {
                        const sectionKey = `${projectGroup.idProjet}::${sectionGroup.sectionName}`;
                        const sectionExpanded = expandedSectionKeys.includes(sectionKey);

                        return (
                          <div key={sectionKey} className="section-version-section-group">
                            <button
                              type="button"
                              className="section-version-section-header"
                              onClick={() => toggleSectionExpanded(sectionKey)}
                            >
                              <div className="section-version-card-title">
                                <div className="section-version-section-badge">
                                  <span>{sectionGroup.sectionDisplay.icon}</span>
                                  <span>{sectionGroup.sectionDisplay.label}</span>
                                </div>
                              </div>
                              <div className="section-version-card-badges">
                                <span className="snapshot-section-chip">{sectionGroup.versions.length} version{sectionGroup.versions.length > 1 ? 's' : ''}</span>
                                {sectionGroup.currentCount > 0 && (
                                  <span className="snapshot-current-badge">{sectionGroup.currentCount} actuelle{sectionGroup.currentCount > 1 ? 's' : ''}</span>
                                )}
                                <span className="section-version-project-toggle">{sectionExpanded ? 'Masquer' : 'Voir'}</span>
                              </div>
                            </button>

                            {sectionExpanded && (
                              <div className="section-version-section-body">
                                {sectionGroup.versions.map((version) => {
                                  const isExpanded = expandedVersionIds.includes(version.id_version);
                                  const summaryItems = getSummaryItems(version);
                                  const compareResult = compareResults[version.id_version];
                                  const isComparing = comparingVersionIds.includes(version.id_version);

                                  return (
                                    <article
                                      key={version.id_version}
                                      className={`section-version-card ${version.is_current ? 'section-version-card-current' : ''}`}
                                    >
                                      <div className="section-version-card-header">
                                        <div className="section-version-card-title">
                                          <div className="section-version-title-block">
                                            <h3>Version #{version.version_number}</h3>
                                            <p>{formatDate(version.snapshot_date)}</p>
                                          </div>
                                        </div>
                                        <div className="section-version-card-badges">
                                          {version.is_current && (
                                            <span className="snapshot-current-badge">Version actuelle</span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="section-version-meta-grid">
                                        <div>
                                          <span className="section-version-meta-label">Créée par</span>
                                          <strong>{version.created_by?.nom_complet || version.created_by?.username || 'N/A'}</strong>
                                        </div>
                                        <div>
                                          <span className="section-version-meta-label">Description</span>
                                          <strong>{version.description || 'Aucune description'}</strong>
                                        </div>
                                      </div>

                                      {summaryItems.length > 0 && (
                                        <div className="section-version-summary-chips">
                                          {summaryItems.map((item) => (
                                            <span key={item} className="snapshot-section-chip">{item}</span>
                                          ))}
                                        </div>
                                      )}

                                      <div className="section-version-card-actions">
                                        <button
                                          className="btn-secondary"
                                          onClick={() => toggleExpanded(version.id_version)}
                                        >
                                          {isExpanded ? 'Masquer le détail' : 'Voir le détail'}
                                        </button>
                                        <button
                                          className="btn-secondary"
                                          onClick={() => handleCompareWithCurrent(version)}
                                          disabled={isComparing}
                                        >
                                          {isComparing ? 'Comparaison...' : 'Comparer avec l’état actuel'}
                                        </button>
                                        <button
                                          className="btn-restore"
                                          onClick={() => handleShowRestore(version)}
                                        >
                                          Restaurer cette version
                                        </button>
                                      </div>

                                      {isExpanded && (
                                        <div className="section-version-expanded">
                                          <div className="preview-header">
                                            <p><strong>Projet :</strong> {version.projet_nom} ({version.id_projet})</p>
                                            <p><strong>Section :</strong> {sectionGroup.sectionDisplay.label}</p>
                                            <p><strong>Date :</strong> {formatDate(version.snapshot_date)}</p>
                                            <p><strong>Créée par :</strong> {version.created_by?.nom_complet || 'N/A'}</p>
                                          </div>

                                          <div className="preview-data">
                                            <h4>Contenu sauvegardé</h4>
                                            <pre className="json-preview">
                                              {JSON.stringify(version.section_data, null, 2)}
                                            </pre>
                                          </div>

                                          {compareResult && (
                                            <div className="section-version-compare-panel">
                                              <h4>Différences avec l’état actuel</h4>
                                              {compareResult.hasChanges ? (
                                                <div className="section-version-diff-list">
                                                  {compareResult.changes.map((change) => (
                                                    <div key={`${version.id_version}-${change.key}`} className="section-version-diff-item">
                                                      <div className="section-version-diff-label">{change.label}</div>
                                                      <div className="section-version-diff-values">
                                                        <div className="section-version-diff-before">
                                                          <span>Avant</span>
                                                          <strong>{change.before}</strong>
                                                        </div>
                                                        <div className="section-version-diff-arrow">→</div>
                                                        <div className="section-version-diff-after">
                                                          <span>Actuel</span>
                                                          <strong>{change.after}</strong>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : (
                                                <div className="section-version-no-diff">
                                                  Cette version correspond déjà à l’état actuel de la section.
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </article>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>
      )}

      {showRestoreModal && selectedVersion && (
        <div className="modal-overlay" onClick={() => setShowRestoreModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Confirmer la restauration</h3>
            <div className="modal-body">
              <p><strong>Projet :</strong> {selectedVersion.projet_nom} ({selectedVersion.id_projet})</p>
              <p><strong>Section :</strong> {getSectionDisplay(selectedVersion.section_name).label}</p>
              <p><strong>Version :</strong> #{selectedVersion.version_number}</p>
              <p><strong>Date :</strong> {formatDate(selectedVersion.snapshot_date)}</p>
              <p><strong>Créée par :</strong> {selectedVersion.created_by?.nom_complet || 'N/A'}</p>

              <div className="form-group">
                <label>Raison de la restauration</label>
                <textarea
                  value={restoreReason}
                  onChange={(e) => setRestoreReason(e.target.value)}
                  placeholder="Ex: retour à la dernière version validée"
                  rows="3"
                />
              </div>

              <div className="warning-box">
                ⚠️ Cette restauration remplacera les données actuelles de cette section par celles de la version choisie.
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
                {restoring ? 'Restauration...' : 'Confirmer la restauration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
