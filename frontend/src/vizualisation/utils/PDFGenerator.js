// frontend/src/visualisation/components/PDFGenerator.jsx
import React, { useState } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function PDFGenerator({ projectId }) {
  const [loading, setLoading] = useState(false);

  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return 'Non renseigné';
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'Non renseigné';
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
    return String(value);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Non renseigné';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR') + ' ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Non renseigné';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const generatePDF = async () => {
    if (!projectId) {
      alert('ID projet manquant');
      return;
    }

    setLoading(true);

    try {
      let actualProjetId = projectId;
      if (typeof projectId === 'object' && projectId !== null) {
        actualProjetId = projectId.id_projet || projectId.id || projectId;
      }

      const response = await fetch(`http://localhost:3000/api/projets/${actualProjetId}`);
      if (!response.ok) throw new Error(`Erreur ${response.status}`);
      const json = await response.json();
      if (!json.success || !json.data) throw new Error('Aucune donnée trouvée');

      const { projet, porteurs, suivis, thematiques, documents, geometries, statut, serviceDdt, createur } = json.data;

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      doc.setFont('MARIANNE');
      let yPosition = 8;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 10;
      const maxWidth = 190;

      const addSection = (title) => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 8;
        }
        yPosition += 2;
        doc.setFontSize(10);
        doc.setFont('MARIANNE', 'bold');
        doc.setTextColor(25, 118, 210);
        doc.text(title, margin, yPosition);
        yPosition += 3;
        doc.setDrawColor(25, 118, 210);
        doc.line(margin, yPosition, 210 - margin, yPosition);
        yPosition += 2;
        doc.setFont('MARIANNE', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
      };

      const addField = (label, value) => {
        if (yPosition > pageHeight - 6) {
          doc.addPage();
          yPosition = 8;
        }
        const formattedValue = formatValue(value);
        doc.setFont('MARIANNE', 'bold');
        doc.text(`${label}:`, margin, yPosition);
        doc.setFont('MARIANNE', 'normal');
        const textDimensions = doc.getTextDimensions(formattedValue, { maxWidth: maxWidth - 50 });
        const cellHeight = textDimensions.h + 0.5;
        doc.text(formattedValue, margin + 50, yPosition, { maxWidth: maxWidth - 50 });
        yPosition += Math.max(cellHeight + 1, 2.5);
      };

      // INFORMATIONS PROJET
            // ===== INFORMATIONS DU PROJET =====
      addSection('Informations du Projet');
      addField('ID Projet', projet?.id);
      addField('Nom du Projet', projet?.nom);
      addField('Description', projet?.description);
      addField('Statut du projet', statut?.libelle);
      addField('Date d\'identification du projet', formatDateTime(projet?.dateIdentification));
      addField('Service Référent', serviceDdt?.libelle);
      addField('Référent DDT', projet?.referentDdt);
      addField('Créateur de la fiche projet', createur?.nomComplet);
      addField('Date Création de la fiche projet', formatDateTime(projet?.dateCreation));

      // PORTEURS
      addSection('Porteurs de Projet');
      if (porteurs && porteurs.length > 0) {
        porteurs.forEach((p, idx) => {
          if (yPosition > pageHeight - 18) {
            doc.addPage();
            yPosition = 8;
          }
          doc.setFont('MARIANNE', 'bold');
          doc.setFontSize(8.5);
          let porteurLabel = `Porteur #${idx + 1}`;
          if (p.type_porteur) porteurLabel += ` - ${p.type_porteur}`;
          doc.text(porteurLabel, margin + 2, yPosition);
          yPosition += 2;
          doc.setFont('MARIANNE', 'normal');
          doc.setFontSize(8);

          if (p.nom_structure) addField('  Structure', p.nom_structure);
          if (p.referent_nom) addField('  Référent', p.referent_nom);
          if (p.referent_fonction) addField('  Fonction du référent', p.referent_fonction);
          if (p.referent_email) addField('  Email du référent', p.referent_email);
          if (p.referent_tel) addField('  Téléphone du référent', p.referent_tel);

          yPosition += 1;
        });
      } else {
        doc.text('Aucun porteur', margin, yPosition);
        yPosition += 2;
      }

      // SUIVI
      addSection('Suivi DDT');
      if (suivis && suivis.length > 0) {
        suivis.forEach((s, idx) => {
          if (yPosition > pageHeight - 12) {
            doc.addPage();
            yPosition = 8;
          }
          doc.setFont('MARIANNE', 'bold');
          doc.setFontSize(8.5);
          doc.text(`Suivi ${idx + 1}`, margin + 2, yPosition);
          yPosition += 2;
          doc.setFont('MARIANNE', 'normal');
          doc.setFontSize(8);
          addField('  Date', formatDateTime(s.dateCreation));
          addField('  Auteur', s.creePar?.nomComplet || 'Anonyme');
          addField('  Contenu', s.contenu);
          yPosition += 0.5;
        });
      } else {
        doc.text('Aucun suivi', margin, yPosition);
        yPosition += 2;
      }

      // THÉMATIQUES
      addSection('Thématiques');
      if (thematiques && thematiques.length > 0) {
        thematiques.forEach((t) => {
          if (yPosition > pageHeight - 15) {
            doc.addPage();
            yPosition = 8;
          }
          doc.setFont('MARIANNE', 'bold');
          doc.setFontSize(9);
          doc.text(`${t.libelle}`, margin, yPosition);
          yPosition += 2.5;
          doc.setFont('MARIANNE', 'normal');
          doc.setFontSize(8);

          const modelEntries = Object.entries(t.donnees || {});
          modelEntries.forEach(([modelKey, dataObj]) => {
            const meta = t.fieldsMetadataByModel?.[modelKey];
            const fields = meta?.fields || [];

            if (yPosition > pageHeight - 12) {
              doc.addPage();
              yPosition = 8;
            }

            doc.setFont('MARIANNE', 'bold');
            doc.setFontSize(8.5);
            doc.text(`  ${meta?.displayName || modelKey}`, margin + 2, yPosition);
            yPosition += 2;
            doc.setFont('MARIANNE', 'normal');
            doc.setFontSize(8);

            fields.forEach((field) => {
              if (yPosition > pageHeight - 4) {
                doc.addPage();
                yPosition = 8;
              }
              const value = dataObj?.[field.name];
              const formattedValue = formatValue(value);
              doc.setFont('MARIANNE', 'bold');
              doc.text(`    ${field.label}:`, margin + 4, yPosition);
              doc.setFont('MARIANNE', 'normal');
              doc.text(formattedValue, margin + 50, yPosition, { maxWidth: maxWidth - 50 });
              yPosition += 1.5;
            });

            yPosition += 0.5;
          });
        });
      }

      doc.save(`Projet_${actualProjetId}.pdf`);
    } catch (error) {
      alert('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={generatePDF} disabled={loading} style={{ padding: '10px 20px' }}>
      {loading ? 'Génération...' : '📥 PDF'}
    </button>
  );
}
