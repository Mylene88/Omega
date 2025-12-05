// frontend/src/components/admin/ExportTab.js
import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/apiConfig';
import './ExportTab.css';

const ExportTab = () => {
  const [exportType, setExportType] = useState('audits'); // 'audits' ou 'snapshots'
  const [format, setFormat] = useState('csv'); // 'csv' ou 'json'
  const [filters, setFilters] = useState({
    limit: 1000,
    userId: '',
    tableName: '',
    action: '',
    idProjet: '',
    dateFrom: '',
    dateTo: ''
  });
  const [isExporting, setIsExporting] = useState(false);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);

  // Charger la liste des utilisateurs et projets pour les filtres
  useEffect(() => {
    loadUsers();
    loadProjects();
  }, []);

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data || []);
      }
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/projets`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setProjects(data || []);
      }
    } catch (error) {
      console.error('Erreur chargement projets:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Construire l'URL avec les paramètres
      const params = new URLSearchParams();
      params.append('format', format);

      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          // Pour les audits, certains filtres ne sont pas applicables aux snapshots
          if (exportType === 'audits') {
            if (['limit', 'userId', 'tableName', 'action', 'dateFrom', 'dateTo'].includes(key)) {
              params.append(key, value);
            }
          } else if (exportType === 'snapshots') {
            if (['limit', 'userId', 'idProjet', 'dateFrom', 'dateTo'].includes(key)) {
              params.append(key, value);
            }
          }
        }
      });

      const endpoint = exportType === 'audits'
        ? `${API_BASE_URL}/api/admin/audit/export?${params.toString()}`
        : `${API_BASE_URL}/api/admin/snapshots/export?${params.toString()}`;

      const token = localStorage.getItem('token');
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de l\'export');
      }

      // Télécharger le fichier
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = exportType === 'audits' ? 'audit_logs.csv' : 'snapshots.csv';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) filename = filenameMatch[1];
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert(`✅ Export ${exportType} réussi !`);
    } catch (error) {
      console.error('Erreur export:', error);
      alert(`❌ Erreur lors de l'export: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      limit: 1000,
      userId: '',
      tableName: '',
      action: '',
      idProjet: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  return (
    <div className="export-tab">
      <div className="export-header">
        <h2>📥 Export des Données</h2>
        <p>Exportez les journaux d'audit et les snapshots avec des filtres personnalisés</p>
      </div>

      {/* Sélection du type d'export */}
      <div className="export-type-selector">
        <button
          className={`type-btn ${exportType === 'audits' ? 'active' : ''}`}
          onClick={() => setExportType('audits')}
        >
          📋 Journaux d'Audit
        </button>
        <button
          className={`type-btn ${exportType === 'snapshots' ? 'active' : ''}`}
          onClick={() => setExportType('snapshots')}
        >
          📸 Snapshots
        </button>
      </div>

      {/* Sélection du format */}
      <div className="format-selector">
        <label>Format d'export :</label>
        <select value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="csv">CSV (Excel)</option>
          <option value="json">JSON</option>
        </select>
      </div>

      {/* Filtres */}
      <div className="filters-section">
        <h3>🔍 Filtres</h3>

        <div className="filter-grid">
          {/* Limite */}
          <div className="filter-field">
            <label>Nombre maximal d'entrées</label>
            <input
              type="number"
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', e.target.value)}
              min="1"
              max="10000"
            />
          </div>

          {/* Utilisateur */}
          <div className="filter-field">
            <label>Utilisateur</label>
            <select
              value={filters.userId}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
            >
              <option value="">Tous les utilisateurs</option>
              {users.map(user => (
                <option key={user.id_user} value={user.id_user}>
                  {user.username} - {user.nom_complet || `${user.prenom} ${user.nom}`}
                </option>
              ))}
            </select>
          </div>

          {/* Filtres spécifiques aux audits */}
          {exportType === 'audits' && (
            <>
              <div className="filter-field">
                <label>Table</label>
                <input
                  type="text"
                  value={filters.tableName}
                  onChange={(e) => handleFilterChange('tableName', e.target.value)}
                  placeholder="Ex: projet, user, etc."
                />
              </div>

              <div className="filter-field">
                <label>Action</label>
                <select
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                >
                  <option value="">Toutes les actions</option>
                  <option value="CREATE">CREATE</option>
                  <option value="UPDATE">UPDATE</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
            </>
          )}

          {/* Filtres spécifiques aux snapshots */}
          {exportType === 'snapshots' && (
            <div className="filter-field">
              <label>Projet</label>
              <select
                value={filters.idProjet}
                onChange={(e) => handleFilterChange('idProjet', e.target.value)}
              >
                <option value="">Tous les projets</option>
                {projects.map(project => (
                  <option key={project.id_projet} value={project.id_projet}>
                    {project.id_projet} - {project.nom_projet}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dates */}
          <div className="filter-field">
            <label>Date de début</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </div>

          <div className="filter-field">
            <label>Date de fin</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </div>
        </div>

        <div className="filter-actions">
          <button className="reset-btn" onClick={resetFilters}>
            🔄 Réinitialiser
          </button>
        </div>
      </div>

      {/* Bouton d'export */}
      <div className="export-action">
        <button
          className="export-btn"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <>
              <span className="spinner"></span>
              Export en cours...
            </>
          ) : (
            <>
              📥 Exporter {exportType === 'audits' ? 'les Audits' : 'les Snapshots'}
            </>
          )}
        </button>
      </div>

      {/* Info */}
      <div className="export-info">
        <p>
          <strong>ℹ️ Information :</strong> Les exports sont limités à {filters.limit.toLocaleString()} entrées maximum.
          Les fichiers CSV sont compatibles avec Excel et les fichiers JSON peuvent être utilisés pour l'analyse de données.
        </p>
      </div>
    </div>
  );
};

export default ExportTab;
