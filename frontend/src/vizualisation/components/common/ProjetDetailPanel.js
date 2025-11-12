// frontend/src/visualisation/components/common/ProjetDetailPanel.js
import React from 'react';
import { getStatusBadgeClass } from '../../utils/statutColors';
import { formatDateTime, formatDate } from '../../utils/DateFormat';

export default function ProjetDetailPanel({
                                              selectedProjectDetails,
                                              loadingDetails,
                                              expandedSections,
                                              onToggleSection,
                                              onClose
                                          }) {

    const formatFieldLabel = (fieldName) => {
        return fieldName
            .split('_')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ')
            .replace(/Id$/, '')
            .replace(/^Id /, '');
    };

    const getFieldLabel = (fieldName, them) => {
        if (them && them.fieldsMetadataByModel) {
            for (const metadata of Object.values(them.fieldsMetadataByModel)) {
                if (metadata.fields && Array.isArray(metadata.fields)) {
                   const field = metadata.fields.find(f => f.name === fieldName);
                    if (field) return field.label;
                }
            }
        }
        return formatFieldLabel(fieldName);
    };

    if (loadingDetails) {
        return (
            <aside className="liste-detail-pane">
                <div className="liste-detail-header">
                    <h3>📋 Détails du projet</h3>
                    <button className="close-detail-btn" onClick={onClose} title="Fermer le détail">×</button>
                </div>
                <div className="liste-detail-content">
                    <div className="sidebar-loading">
                        <div className="spinner" />
                        <p>Chargement...</p>
                    </div>
                </div>
            </aside>
        );
    }

    if (!selectedProjectDetails) {
        return (
            <aside className="liste-detail-pane">
                <div className="liste-detail-header">
                    <h3>📋 Détails du projet</h3>
                    <button className="close-detail-btn" onClick={onClose} title="Fermer le détail">×</button>
                </div>
                <div className="liste-detail-content">
                    <div className="empty-state">
                        <p className="empty-message">Impossible de charger les détails</p>
                    </div>
                </div>
            </aside>
        );
    }

    return (
        <aside className="liste-detail-pane">
            <div className="liste-detail-header">
                <h3>📋 Détails du projet</h3>
                <button className="close-detail-btn" onClick={onClose} title="Fermer le détail">×</button>
            </div>

            <div className="liste-detail-content">
                {/* 1. Informations générales */}
                <div className="accordion-section">
                    <button
                        className={`accordion-header ${expandedSections.infos ? 'active' : ''}`}
                        onClick={() => onToggleSection('infos')}
                    >
                        <span className="accordion-icon">{expandedSections.infos ? '▼' : '▶'}</span>
                        <span className="accordion-title">📌 Informations Générales</span>
                    </button>

                    {expandedSections.infos && (
                        <div className="accordion-content">
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="info-label">ID Projet</span>
                                    <span className="info-value" style={{
                                        fontFamily: 'monospace',
                                        color: '#667eea',
                                        fontWeight: '700'
                                    }}>
                                        {selectedProjectDetails.projet?.id ||
                                        selectedProjectDetails.id_projet ||
                                        'N/A'}
                                    </span>
                                </div>

                                <div className="info-item">
                                    <span className="info-label">Nom du projet</span>
                                    <span className="info-value">
                                        {selectedProjectDetails.projet?.nom ||
                                        selectedProjectDetails.nom_projet ||
                                        'N/A'}
                                    </span>
                                </div>

                                <div className="info-item">
                                    <span className="info-label">Statut du projet</span>
                                    <span className="info-value">
                                        {selectedProjectDetails.statut?.libelle ||
                                        selectedProjectDetails.projet?.statut?.libelle ||
                                        selectedProjectDetails.statut ||
                                        'Aucun statut renseigné'}
                                    </span>
                                </div>

                                <div className="info-item full-width">
                                    <span className="info-label">Description</span>
                                    <p className="info-description">
                                        {selectedProjectDetails.projet?.description ||
                                         selectedProjectDetails.description ||
                                         'Aucune description ajoutée'}
                                    </p>
                                </div>

                                <div className="info-item">
                                    <span className="info-label">Date de prise de connaissance par la DDT</span>
                                    <span className="info-value">
                                        {(selectedProjectDetails.projet?.dateIdentification ||
                                        selectedProjectDetails.date_ident_projet)
                                            ? new Date(selectedProjectDetails.projet?.dateIdentification ||
                                                selectedProjectDetails.date_ident_projet).toLocaleDateString('fr-FR')
                                            : 'Aucune date renseignée'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. PORTEURS DU PROJET */}
                <div className="accordion-section">
                    <button
                        className={`accordion-header ${expandedSections.porteurs ? 'active' : ''}`}
                        onClick={() => onToggleSection('porteurs')}
                    >
                        <span className="accordion-icon">{expandedSections.porteurs ? '▼' : '▶'}</span>
                        <span className="accordion-title">👥 Porteurs du projet</span>
                        <span className="accordion-badge">{selectedProjectDetails.porteurs?.length || 0}</span>
                    </button>

                    {expandedSections.porteurs && (
                        <div className="accordion-content">
                            {selectedProjectDetails.porteurs?.length > 0 ? (
                                selectedProjectDetails.porteurs
                                    .map((p) => ({
                                        type_porteur: p.typePorteur?.libelle,
                                        nom_structure: p.nomStructure,
                                        referent_nom: p.referent?.nom,
                                        referent_fonction: p.referent?.fonction,
                                        referent_email: p.referent?.email,
                                        referent_tel: p.referent?.telephone
                                    }))
                                    .map((p, i) => (
                                        <div key={i} className="porteur-item">
                                            <div className="porteur-header">
                                                <span className="porteur-number">Porteur #{i + 1}</span>
                                                {p.type_porteur && (
                                                    <span className="porteur-type-badge">{p.type_porteur}</span>
                                                )}
                                            </div>

                                            <div className="info-grid">
                                                {p.nom_structure && (
                                                    <div className="info-item full-width">
                                                        <span className="info-label">Structure</span>
                                                        <span className="info-value">{p.nom_structure}</span>
                                                    </div>
                                                )}
                                                {p.referent_nom && (
                                                    <div className="info-item">
                                                        <span className="info-label">Référent</span>
                                                        <span className="info-value">{p.referent_nom}</span>
                                                    </div>
                                                )}
                                                {p.referent_fonction && (
                                                    <div className="info-item">
                                                        <span className="info-label">Fonction du référent</span>
                                                        <span className="info-value">{p.referent_fonction}</span>
                                                    </div>
                                                )}
                                                {p.referent_email && (
                                                    <div className="info-item full-width">
                                                        <span className="info-label">Email du référent</span>
                                                        <a className="info-link" href={`mailto:${p.referent_email}`}>
                                                            {p.referent_email}
                                                        </a>
                                                    </div>
                                                )}
                                                {p.referent_tel && (
                                                    <div className="info-item">
                                                        <span className="info-label">Téléphone du référent</span>
                                                        <span className="info-value">{p.referent_tel}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                            ) : (
                                <div className="empty-state">
                                    <p className="empty-message">Aucun porteur enregistré</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>


                {/* 2. SUIVI DDT */}
                <div className="accordion-section">
                    <button
                        className={`accordion-header ${expandedSections.suivis ? 'active' : ''}`}
                        onClick={() => onToggleSection('suivis')}
                    >
                        <span className="accordion-icon">{expandedSections.suivis ? '▼' : '▶'}</span>
                        <span className="accordion-title">📝 Suivi DDT</span>
                        <span className="accordion-badge">{selectedProjectDetails.suivis?.length || 0}</span>
                    </button>

                    {expandedSections.suivis && (
                        <div className="accordion-content">
                            <div className="info-grid" style={{ marginBottom: '24px' }}>
                                <div className="info-item">
                                    <span className="info-label">Projet signalé</span>
                                    <span className={`info-badge ${
                                        (selectedProjectDetails.projet?.projetSignale || selectedProjectDetails.projet_signale) 
                                            ? 'badge-yes' : 'badge-no'
                                    }`}>
                                        {(selectedProjectDetails.projet?.projetSignale || selectedProjectDetails.projet_signale)
                                            ? 'Oui' : 'Non'}
                                    </span>
                                </div>

                                <div className="info-item">
                                    <span className="info-label">Charte d'Accueil</span>
                                    <span className={`info-badge ${
                                        (selectedProjectDetails.projet?.charteAccueil || selectedProjectDetails.charte_accueil) 
                                            ? 'badge-yes' : 'badge-no'
                                    }`}>
                                        {(selectedProjectDetails.projet?.charteAccueil || selectedProjectDetails.charte_accueil)
                                            ? 'Oui' : 'Non'}
                                    </span>
                                </div>

                                <div className="info-item">
                                    <span className="info-label">Service DDT</span>
                                    <span className="info-value">
                                        {selectedProjectDetails.service ||
                                            selectedProjectDetails.serviceDdt?.libelle ||
                                            selectedProjectDetails.projet?.serviceDdt?.libelle ||
                                            'Non renseigné'}
                                    </span>
                                </div>


                                <div className="info-item">
                                    <span className="info-label">Contact à la DDT</span>
                                    <span className="info-value">
                                        {selectedProjectDetails.projet?.referentDdt ||
                                        selectedProjectDetails.referent_ddt ||
                                        'Non renseigné'}
                                    </span>
                                </div>

                                <div className="info-item">
                                    <span className="info-label">Date de création de la fiche projet</span>
                                    <span className="info-value">
                                        {formatDateTime(selectedProjectDetails.projet?.dateCreation ||
                                                    selectedProjectDetails.created_at)}
                                    </span>
                                </div>

                                <div className="info-item">
                                    <span className="info-label">Créateur de la fiche projet</span>
                                    <span className="info-value">
                                        {selectedProjectDetails.createur?.nomComplet ||
                                        selectedProjectDetails.createur?.username ||
                                        selectedProjectDetails.creator?.nomComplet ||
                                        selectedProjectDetails.creator?.username ||
                                        'N/A'}
                                    </span>
                                </div>

                                <div className="info-item">
                                    <span className="info-label">Date de dernière mise-à-jour</span>
                                    <span className="info-value">
                                        {formatDateTime(selectedProjectDetails.projet?.dateMiseAJour ||
                                                    selectedProjectDetails.updated_at)}
                                    </span>
                                </div>
                            </div>


                            <div style={{
                                marginTop: '24px',
                                paddingTop: '20px',
                                borderTop: '2px solid var(--border-color)'
                            }}>
                                <h4 style={{
                                    margin: '0 0 16px 0',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: 'var(--text-secondary)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}>
                                    Suivi
                                </h4>
                                {selectedProjectDetails.suivis?.length > 0 ? (
                                    <div className="suivis-timeline">
                                        {selectedProjectDetails.suivis.map((s) => (
                                            <div key={s.id} className="suivi-entry">
                                                <div className="suivi-header">
                                                    <span className="suivi-date">
                                                        {formatDateTime(s.dateCreation)}
                                                    </span>
                                                    <span className="suivi-auteur">
                                                        {s.creePar?.nomComplet || 'Non renseigné'}
                                                    </span>
                                                </div>
                                                <p className="suivi-texte">{s.contenu}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state" style={{ padding: '30px 20px' }}>
                                        <p className="empty-message">Aucun suivi enregistré</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>


                {/* 4. THÉMATIQUES */}
                <div className="accordion-section">
                    <button
                        className={`accordion-header ${expandedSections.thematiques ? 'active' : ''}`}
                        onClick={() => onToggleSection('thematiques')}
                    >
                        <span className="accordion-icon">{expandedSections.thematiques ? '▼' : '▶'}</span>
                        <span className="accordion-title">🎯 Thématiques</span>
                        <span className="accordion-badge">
                            {(() => {
                                // Dédupliquer avant de compter
                                const uniques = selectedProjectDetails.thematiques?.reduce((acc, t) => {
                                    if (!acc[t.id]) acc[t.id] = t;
                                    return acc;
                                }, {});
                                return Object.values(uniques || {}).reduce((count, t) => {
                                    if (!t.donnees) return count;
                                    return count + Object.values(t.donnees).filter(d => Array.isArray(d) && d.length > 0).length;
                                }, 0);
                            })()}
                        </span>
                    </button>

                    {expandedSections.thematiques && (
                        <div className="accordion-content">
                            {selectedProjectDetails.thematiques?.length > 0 ? (
                                (() => {
                                    // ✅ Dédupliquer les thématiques par id (le backend peut envoyer des duplicatas)
                                    const thematiquesUniques = selectedProjectDetails.thematiques.reduce((acc, them) => {
                                        // Utiliser l'id de la thématique comme clé pour dédupliquer
                                        if (!acc[them.id]) {
                                            acc[them.id] = them;
                                        }
                                        return acc;
                                    }, {});

                                    const thematiquesDeduplicates = Object.values(thematiquesUniques);

                                    // ✅ Déplier les thématiques : un modèle = une thématique affichée
                                    const thematiquesDepliees = thematiquesDeduplicates.flatMap((them) => {
                                        if (!them.donnees || Object.keys(them.donnees).length === 0) {
                                            return [];
                                        }

                                        return Object.entries(them.donnees)
                                            .filter(([modeleKey, donneesArray]) => Array.isArray(donneesArray) && donneesArray.length > 0)
                                            .map(([modeleKey, donneesArray]) => ({
                                                libelle: them.libelle,
                                                modeleKey: modeleKey,
                                                displayName: them.fieldsMetadataByModel?.[modeleKey]?.displayName || modeleKey,
                                                donnees: donneesArray,
                                                modeleMetadata: them.fieldsMetadataByModel?.[modeleKey]?.fields || [],
                                                originalThem: them
                                            }));
                                    });

                                    if (thematiquesDepliees.length === 0) {
                                        return (
                                            <div className="empty-state">
                                                <p className="empty-message">Aucune thématique pour ce projet</p>
                                            </div>
                                        );
                                    }

                                    return thematiquesDepliees.map((depliee, idx) => (
                                        <div key={idx} className="thematique-item-detailed">
                                            <div className="thematique-header-main">
                                                <h3 className="thematique-nom-principal">
                                                    {depliee.libelle} - {depliee.displayName}
                                                </h3>
                                            </div>

                                            <div className="thematique-donnees">
                                                {depliee.donnees.map((donnee, dIdx) => (
                                                    <div key={dIdx} className="donnee-item">
                                                        {depliee.modeleMetadata && depliee.modeleMetadata.length > 0 ? (
                                                            depliee.modeleMetadata
                                                                .filter(field => {
                                                                    const excludedFields = [
                                                                        'id',
                                                                        'idthematique',
                                                                        'id_thematique',
                                                                        'idprojet',
                                                                        'id_project',
                                                                        'dateCreation',
                                                                        'dateMiseAJour',
                                                                        'created_at',
                                                                        'updated_at',
                                                                        'updatedby',
                                                                        'updated_by',
                                                                        'createdby',
                                                                        'created_by',
                                                                        'creePar'
                                                                    ];
                                                                    const isIdField = field.name.startsWith('id_');
                                                                    return !excludedFields.includes(field.name) && !isIdField;
                                                                })
                                                                .map((field) => {
                                                                    const value = donnee[field.name];

                                                                    let displayValue;
                                                                    // ✅ Vérification améliorée : ne pas considérer 0 ou false comme "non renseigné"
                                                                    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
                                                                        displayValue = <em style={{ color: '#999' }}>Non renseigné</em>;
                                                                    } else if (typeof value === 'boolean') {
                                                                        displayValue = value ? 'Oui' : 'Non';
                                                                    } else if (Array.isArray(value)) {
                                                                        // ✅ DEBUG: afficher ce qui arrive
                                                                        console.log(`[${field.name}] Value reçue:`, value);

                                                                        // ✅ Gérer les tableaux d'IDs ou d'objets
                                                                        const processedValues = value
                                                                            .map(item => {
                                                                                if (item === null || item === undefined || item === '') return null;

                                                                                // Si c'est un objet, extraire la valeur
                                                                                if (typeof item === 'object' && item !== null) {
                                                                                    return item.value || item.libelle || item.label || String(item.id || '');
                                                                                }

                                                                                // Sinon retourner l'item tel quel (ID ou string)
                                                                                return item;
                                                                            })
                                                                            .filter(item => item !== null && item !== undefined && item !== '');

                                                                        console.log(`[${field.name}] Processed values:`, processedValues);

                                                                        displayValue = processedValues.length > 0
                                                                            ? processedValues.join(', ')
                                                                            : <em style={{ color: '#999' }}>Non renseigné</em>;
                                                                    } else if (typeof value === 'object' && value !== null) {
                                                                        displayValue = value.value || value.libelle || JSON.stringify(value);
                                                                    } else {
                                                                        displayValue = String(value);
                                                                    }

                                                                    return (
                                                                        <div key={field.name} className="donnee-field">
                                                                            <span className="field-label">
                                                                                {field.label}:
                                                                            </span>
                                                                            <span className="field-value">
                                                                                {displayValue}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })
                                                        ) : (
                                                            Object.entries(donnee)
                                                                .filter(([key]) => {
                                                                    const excludedFields = [
                                                                        'id', 'idthematique', 'id_thematique', 'idprojet', 'id_project',
                                                                        'dateCreation', 'dateMiseAJour', 'created_at', 'updated_at',
                                                                        'updatedby', 'updated_by', 'createdby', 'created_by', 'creePar'
                                                                    ];
                                                                    const isIdField = key.startsWith('id_');
                                                                    return !excludedFields.includes(key) && !isIdField;
                                                                })
                                                                .map(([key, value]) => {
                                                                    // ✅ Vérification améliorée : ne pas considérer 0 ou false comme "non renseigné"
                                                                    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
                                                                        return null;
                                                                    }

                                                                    let displayValue;
                                                                    if (typeof value === 'boolean') {
                                                                        displayValue = value ? 'Oui' : 'Non';
                                                                    } else if (Array.isArray(value)) {
                                                                        // ✅ DEBUG: afficher ce qui arrive (section sans métadonnées)
                                                                        console.log(`[NO-META: ${key}] Value reçue:`, value);

                                                                        // ✅ Gérer les tableaux d'IDs ou d'objets (sans métadonnées)
                                                                        const processedValues = value
                                                                            .map(item => {
                                                                                if (item === null || item === undefined || item === '') return null;

                                                                                // Si c'est un objet, extraire la valeur
                                                                                if (typeof item === 'object' && item !== null) {
                                                                                    return item.value || item.libelle || item.label || String(item.id || '');
                                                                                }

                                                                                // Sinon retourner l'item tel quel (ID ou string)
                                                                                return item;
                                                                            })
                                                                            .filter(item => item !== null && item !== undefined && item !== '');

                                                                        console.log(`[NO-META: ${key}] Processed values:`, processedValues);

                                                                        if (processedValues.length === 0) {
                                                                            return null;
                                                                        }
                                                                        displayValue = processedValues.join(', ');
                                                                    } else if (typeof value === 'object' && value !== null) {
                                                                        displayValue = value.value || value.libelle || JSON.stringify(value);
                                                                    } else {
                                                                        displayValue = String(value);
                                                                    }

                                                                    return (
                                                                        <div key={key} className="donnee-field">
                                                                            <span className="field-label">
                                                                                {getFieldLabel(key, depliee.originalThem)}:
                                                                            </span>
                                                                            <span className="field-value">
                                                                                {displayValue}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })
                                                        )}

                                                        {depliee.donnees.length > 1 && dIdx < depliee.donnees.length - 1 && (
                                                            <div className="donnee-separator"></div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ));
                                })()
                            ) : (
                                <div className="empty-state">
                                    <p className="empty-message">Aucune thématique pour ce projet</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 5. DOCUMENTS */}
                <div className="accordion-section">
                    <button
                        className={`accordion-header ${expandedSections.documents ? 'active' : ''}`}
                        onClick={() => onToggleSection('documents')}
                    >
                        <span className="accordion-icon">{expandedSections.documents ? '▼' : '▶'}</span>
                        <span className="accordion-title">📄 Documents</span>
                        <span className="accordion-badge">{selectedProjectDetails.documents?.length || 0}</span>
                    </button>

                    {expandedSections.documents && (
                        <div className="accordion-content">
                            {selectedProjectDetails.documents?.length > 0 ? (
                                <div className="documents-list">
                                    {selectedProjectDetails.documents
                                        .map((d) => ({
                                            id: d.id,
                                            lienlocal: d.lienLocal,
                                            lienweb: d.lienWeb
                                        }))
                                        .map((doc, i) => (
                                            <div key={i} className="document-item">
                                                <span className="document-icon">📎</span>
                                                <div className="document-info">
                                                    {doc.lienlocal && (
                                                        <div>
                                                            <span className="info-label">Fichier local : </span>
                                                            <p className="document-nom">{doc.lienlocal.join}</p>
                                                        </div>
                                                    )}
                                                    {doc.lienweb && (
                                                        <div>
                                                            <span className="info-label">Lien web : </span>
                                                            <a
                                                                className="document-link"
                                                                href={doc.lienweb}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                {doc.lienweb}
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <p className="empty-message">Aucun document associé</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>


                {/* 6. GÉOMÉTRIES */}
                <div className="accordion-section">
                    <button
                        className={`accordion-header ${expandedSections.geometries ? 'active' : ''}`}
                        onClick={() => onToggleSection('geometries')}
                    >
                        <span className="accordion-icon">{expandedSections.geometries ? '▼' : '▶'}</span>
                        <span className="accordion-title">🗺️ Géométries</span>
                        <span className="accordion-badge">{selectedProjectDetails.geometries?.length || 0}</span>
                    </button>

                    {expandedSections.geometries && (
                        <div className="accordion-content">
                            {selectedProjectDetails.geometries?.length > 0 ? (
                                selectedProjectDetails.geometries.map((g, i) => (
                                    <div key={i} className="geom-item">
                                        <div className="geom-header">
                                            <span className="geom-type">{g.type || 'Géométrie'}</span>
                                            {g.id_geom && <span className="geom-id">ID: {g.id_geom}</span>}
                                        </div>

                                        {(g.surface || g.longueur) && (
                                            <div className="geom-metrics">
                                                {g.surface !== undefined && g.surface !== null && (
                                                    <div className="metric">
                                                        <span className="metric-label">Superficie</span>
                                                        <span className="metric-value">{Number(g.surface).toLocaleString()} m²</span>
                                                    </div>
                                                )}
                                                {g.longueur !== undefined && g.longueur !== null && (
                                                    <div className="metric">
                                                        <span className="metric-label">Longueur</span>
                                                        <span className="metric-value">{Number(g.longueur).toLocaleString()} m</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {Array.isArray(g.communes_traversees) && g.communes_traversees.length > 0 && (
                                            <div className="geom-section">
                                                <h5 className="geom-section-title">
                                                    {g.type === 'Point' ? 'Commune' : 'Communes traversées'}
                                                </h5>
                                                <div className="communes-box">{g.communes_traversees.join(', ')}</div>
                                            </div>
                                        )}

                                        {Array.isArray(g.codes_insee) && g.codes_insee.length > 0 && (
                                            <div className="geom-section">
                                                <h5 className="geom-section-title">Codes INSEE</h5>
                                                <div className="codes-box">{g.codes_insee.join(', ')}</div>
                                            </div>
                                        )}

                                        {Array.isArray(g.epci) && g.epci.length > 0 && (
                                            <div className="geom-section">
                                                <h5 className="geom-section-title">EPCI</h5>
                                                <div className="epci-box">{g.epci.join(', ')}</div>
                                            </div>
                                        )}

                                        {Array.isArray(g.arrondissements) && g.arrondissements.length > 0 && (
                                            <div className="geom-section">
                                                <h5 className="geom-section-title">Arrondissements</h5>
                                                <div className="arrondissements-box">{g.arrondissements.join(', ')}</div>
                                            </div>
                                        )}

                                        {Array.isArray(g.maires) && g.maires.length > 0 && (
                                            <div className="geom-section">
                                                <h5 className="geom-section-title">Maire(s)</h5>
                                                <div className="codes-box">{g.maires.join(', ')}</div>
                                            </div>
                                        )}

                                        {Array.isArray(g.deputes) && g.deputes.length > 0 && (
                                            <div className="geom-section">
                                                <h5 className="geom-section-title">Député(s)</h5>
                                                <div className="codes-box">{g.deputes.join(', ')}</div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="empty-state">
                                    <p className="empty-message">Aucune géométrie associée</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
