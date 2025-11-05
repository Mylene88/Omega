// frontend/src/visualisation/components/common/Telechargement.js
import React, { useState } from 'react';
import '../../styles/Telechargement.module.css';

export default function Telechargement({
  isOpen,
  onClose,
  projectId,
  projectName
}) {
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setDownloading(true);

    try {
      const response = await fetch(
        `http://localhost:3000/api/projets/${projectId}/export?format=${selectedFormat}`
      );


      if (!response.ok) throw new Error('Erreur lors du téléchargement');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `projet_${projectId}_${projectName}.${selectedFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      onClose();
    } catch (error) {
      console.error('❌ Erreur téléchargement:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="telechargement-overlay">
      <div className="telechargement-modal">
        <div className="telechargement-header">
          <h3>Télécharger le projet</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="telechargement-body">
          <p className="project-name">{projectName}</p>

          <div className="format-selector">
            <label>
              <input
                type="radio"
                value="pdf"
                checked={selectedFormat === 'pdf'}
                onChange={(e) => setSelectedFormat(e.target.value)}
              />
              <span>PDF</span>
            </label>

            <label>
              <input
                type="radio"
                value="csv"
                checked={selectedFormat === 'csv'}
                onChange={(e) => setSelectedFormat(e.target.value)}
              />
              <span>CSV</span>
            </label>

            <label>
              <input
                type="radio"
                value="geojson"
                checked={selectedFormat === 'geojson'}
                onChange={(e) => setSelectedFormat(e.target.value)}
              />
              <span>GeoJSON</span>
            </label>
          </div>
        </div>

        <div className="telechargement-footer">
          <button onClick={onClose} className="btn-cancel">
            Annuler
          </button>
          <button
            onClick={handleDownload}
            className="btn-download"
            disabled={downloading}
          >
            {downloading ? 'Téléchargement...' : 'Télécharger'}
          </button>
        </div>
      </div>
    </div>
  );
}
