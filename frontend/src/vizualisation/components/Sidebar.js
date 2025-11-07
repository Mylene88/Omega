// frontend/src/visualisation/components/Sidebar.jsx
import React, { useEffect, useState } from 'react';
import '../styles/SidebarStyle.css';
import { formatDateTime, formatDate } from '../utils/DateFormat';

export default function Sidebar({ projectId, onClose }) {
    const [info, setInfo] = useState(null);
    const [err, setErr] = useState(null);
    const [loading, setLoading] = useState(false);

    // États d'expansion des sections (accordéon)
    const [expandedSections, setExpandedSections] = useState({
        infos: true,
        suivis: false,
        porteurs: false,
        thematiques: true,
        documents: false,
        geometries: false
    });

    const toggleSection = (key) => {
        setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const formatFieldLabel = (fieldName) => {
        return fieldName
            .split('_')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ')
            .replace(/Id$/, '')
            .replace(/^Id /, '');
    };

    /*const getFieldLabel = (fieldName, thematiques) => {
        const metadata = thematiques.fieldsMetadata?.find(f => f.name === fieldName);
        return metadata ? metadata.label : formatFieldLabel(fieldName);
    }*/

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

    useEffect(() => {
        if (!projectId) {
            setInfo(null);
            return;
        }

        let actualProjetId = projectId;
        if (typeof projectId === 'object' && projectId !== null) {
            actualProjetId = projectId.id_projet || projectId.id || projectId;
        }

        setErr(null);
        setInfo(null);
        setLoading(true);

        fetch(`http://localhost:3000/api/projets/${actualProjetId}`)
            .then((res) => {
                if (!res.ok) throw new Error(`Erreur ${res.status}`);
                return res.json();
            })
            .then((json) => {
                if (!json.success || !json.data) {
                    setErr('Aucune donnée trouvée');
                    return;
                }

                const {
                    projet,
                    porteurs,
                    suivis,
                    thematiques,
                    documents,
                    geometries,
                    statut,
                    serviceDdt,
                    createur
                } = json.data;

                setInfo({
                    // En-tête
                    id_projet: projet?.id,
                    nom_projet: projet?.nom,
                    description: projet?.description,
                    statut: statut?.libelle,
                    date_ident_projet: projet?.dateIdentification,
                    projet_signale: projet?.projetSignale,
                    charte_accueil: projet?.charteAccueil,
                    service: serviceDdt?.libelle,
                    referent_ddt: projet?.referentDdt,
                    created_at: projet?.dateCreation,
                    createur: createur?.nomComplet,
                    updated_at: projet?.dateMiseAJour,

                    // Suivis
                    suivis: (suivis || []).map((s) => ({
                        id: s.id,
                        texte: s.contenu,
                        date: s.dateCreation,
                        auteur: s.creePar?.nomComplet || 'Anonyme'
                    })),

                    // Porteurs
                    porteurs: (porteurs || []).map((p) => ({
                        type_porteur: p.typePorteur?.libelle,
                        nom_structure: p.nomStructure,
                        referent_nom: p.referent?.nom,
                        referent_fonction: p.referent?.fonction,
                        referent_email: p.referent?.email,
                        referent_tel: p.referent?.telephone
                    })),

                    // ✅ Thématiques : DÉDUPLIQUÉES PAR ID + DÉPLIÉES (une ligne par modèle)
                    thematiques: (() => {
                        // Étape 1: Dédupliquer par ID (comme dans ProjetDetailPanel)
                        const thematiquesUniques = (thematiques || []).reduce((acc, them) => {
                            if (!acc[them.id]) {
                                acc[them.id] = them;
                            }
                            return acc;
                        }, {});

                        const thematiquesDeduplicates = Object.values(thematiquesUniques);

                        // Étape 2: Déplier pour avoir une entrée par modèle (flatMap)
                        const thematiquesDepliees = thematiquesDeduplicates.flatMap((them) => {
                            if (!them.donnees || Object.keys(them.donnees).length === 0) {
                                return [];
                            }

                            return Object.entries(them.donnees)
                                .filter(([modeleKey, donneesArray]) =>
                                    Array.isArray(donneesArray) && donneesArray.length > 0
                                )
                                .map(([modeleKey, donneesArray]) => ({
                                    libelle: them.libelle,
                                    modeleKey: modeleKey,
                                    displayName: them.fieldsMetadataByModel?.[modeleKey]?.displayName || modeleKey,
                                    donnees: donneesArray,
                                    modeleMetadata: them.fieldsMetadataByModel?.[modeleKey]?.fields || [],
                                    originalThem: them
                                }));
                        });

                        return thematiquesDepliees;
                    })(),
                    // Docs
                    documents: (documents || []).map((d) => ({
                        id: d.id,
                        lien_local: d.lienLocal,
                        lien_web: d.lienWeb
                    })),

                    // Géométries
                    geometries: (geometries || []).map((g) => ({
                        //id_geom: g.id,
                        type: g.type,
                        surface: g.surface,
                        longueur: g.longueur,
                        communes_traversees: g.communes_traversees || [],
                        codes_insee: g.codes_insee || [],
                        epci: g.epci || [],
                        arrondissements: g.arrondissements || [],
                        deputes: g.deputes || [],
                        maires: g.maires || []
                    }))
                });
            })
            .catch((error) => {
                setErr(error.message || 'Erreur lors du chargement');
            })
            .finally(() => setLoading(false));
    }, [projectId]);

    if (!projectId) return null;

    return (
        <div className="sidebar-card">
            {/* Header */}
            <div className="sidebar-card-header">
                <h2>📋 Détails du projet</h2>
                <button className="sidebar-close-btn" onClick={onClose} aria-label="Fermer">
                    ×
                </button>
            </div>

            {/* Body */}
            <div className="sidebar-card-body">
                {loading && (
                    <div className="sidebar-loading">
                        <div className="spinner" />
                        <p>Chargement...</p>
                    </div>
                )}

                {err && <div className="sidebar-error">❌ {err}</div>}

                {info && (
                    <>
                        {/* ✅ Informations générales - AVEC ID PROJET */}
                        <div className="accordion-section">
                            <button
                                className={`accordion-header ${expandedSections.infos ? 'active' : ''}`}
                                onClick={() => toggleSection('infos')}
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
                                                {info.id_projet || 'N/A'}
                                            </span>
                                        </div>

                                        <div className="info-item">
                                            <span className="info-label">Nom du projet</span>
                                            <span className="info-value">{info.nom_projet || 'N/A'}</span>
                                        </div>

                                        <div className="info-item">
                                            <span className="info-label">Statut du projet</span>
                                            <span className="info-value">
                                                {info.statut || 'Aucun statut renseigné'}
                                            </span>
                                        </div>

                                        <div className="info-item full-width">
                                            <span className="info-label">Description</span>
                                            <p className="info-description">
                                                {info.description || 'Aucune description ajoutée'}
                                            </p>
                                        </div>

                                        <div className="info-item">
                                            <span className="info-label">Date de prise de connaissance par la DDT</span>
                                            <span className="info-value">
                                                {info.date_ident_projet
                                                    ? new Date(info.date_ident_projet).toLocaleDateString('fr-FR')
                                                    : 'Aucune date renseignée'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 3️⃣ SUIVI DDT */}
                        <div className="accordion-section">
                            <button
                                className={`accordion-header ${expandedSections.suivis ? 'active' : ''}`}
                                onClick={() => toggleSection('suivis')}
                            >
                                <span className="accordion-icon">{expandedSections.suivis ? '▼' : '▶'}</span>
                                <span className="accordion-title">📝 Suivi DDT</span>
                                <span className="accordion-badge">{info.suivis?.length || 0}</span>
                            </button>

                            {expandedSections.suivis && (
                                <div className="accordion-content">
                                    {/* Informations du suivi DDT */}
                                    <div className="info-grid" style={{ marginBottom: '24px' }}>
                                        <div className="info-item">
                                            <span className="info-label">Projet signalé</span>
                                            <span className={`info-badge ${info.projet_signale ? 'badge-yes' : 'badge-no'}`}>
                                                {info.projet_signale ? 'Oui' : 'Non'}
                                            </span>
                                        </div>

                                        <div className="info-item">
                                            <span className="info-label">Charte d'Accueil</span>
                                            <span className={`info-badge ${info.charte_accueil ? 'badge-yes' : 'badge-no'}`}>
                                                {info.charte_accueil ? 'Oui' : 'Non'}
                                            </span>
                                        </div>

                                        <div className="info-item">
                                            <span className="info-label">Service DDT</span>
                                            <span className="info-value">{info.service || 'N/A'}</span>
                                        </div>

                                        <div className="info-item">
                                            <span className="info-label">Contact à la DDT</span>
                                            <span className="info-value">{info.referent_ddt || 'N/A'}</span>
                                        </div>

                                        <div className="info-item">
                                            <span className="info-label">Date de création de la fiche projet </span>
                                           <span className="info-value">{formatDateTime(info.created_at)}</span>
                                        </div>

                                        <div className="info-item">
                                            <span className="info-label">Créateur de la fiche projet </span>
                                            <span className="info-value">{info.createur || 'N/A'}</span>
                                        </div>

                                        <div className="info-item">
                                            <span className="info-label">Date de dernière mise-à-jour</span>
                                            <span className="info-value">{formatDateTime(info.updated_at)}</span>
                                        </div>

                                    </div>

                                    {/* Historique des suivis */}
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
                                        {info.suivis?.length > 0 ? (
                                            <div className="suivis-timeline">
                                                {info.suivis.map((s) => (
                                                    <div key={s.id} className="suivi-entry">
                                                        <div className="suivi-header">
                                                            <span className="suivi-date">
                                                               {formatDateTime(s.date)}
                                                            </span>
                                                            <span className="suivi-auteur">{s.auteur}</span>
                                                        </div>
                                                        <p className="suivi-texte">{s.texte}</p>
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

                        {/* Porteurs - Toujours affiché */}
                        <div className="accordion-section">
                            <button
                                className={`accordion-header ${expandedSections.porteurs ? 'active' : ''}`}
                                onClick={() => toggleSection('porteurs')}
                            >
                                <span className="accordion-icon">{expandedSections.porteurs ? '▼' : '▶'}</span>
                                <span className="accordion-title">👥 Porteurs du projet</span>
                                <span className="accordion-badge">{info.porteurs?.length || 0}</span>
                            </button>

                            {expandedSections.porteurs && (
                                <div className="accordion-content">
                                    {info.porteurs?.length > 0 ? (
                                        info.porteurs.map((p, i) => (
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

                        {/* Thématiques - Toujours affiché */}
                        <div className="accordion-section">
                            <button
                                className={`accordion-header ${expandedSections.thematiques ? 'active' : ''}`}
                                onClick={() => toggleSection('thematiques')}
                            >
                                <span className="accordion-icon">{expandedSections.thematiques ? '▼' : '▶'}</span>
                                <span className="accordion-title">🎯 Thématiques</span>
                                <span className="accordion-badge">{info.thematiques?.length || 0}</span>
                            </button>

                            {expandedSections.thematiques && (
                                <div className="accordion-content">
                                    {info.thematiques?.length > 0 ? (
                                        info.thematiques.map((depliee, idx) => (
                            <div key={idx} className="thematique-item-detailed">
                                {/* ✅ En-tête : Catégorie - Modèle */}
                                <div className="thematique-header-main">
                                    <h3 className="thematique-nom-principal">
                                        {depliee.libelle} - {depliee.displayName}
                                    </h3>
                                </div>

                                {/* ✅ DONNÉES DU MODÈLE */}
                                <div className="thematique-donnees">
                                    {depliee.donnees.map((donnee, dIdx) => (
                                        <div key={dIdx} className="donnee-item">
                                            {/* ✅ AFFICHAGE DE TOUS LES CHAMPS DEPUIS METADATA */}
                                            {depliee.modeleMetadata && depliee.modeleMetadata.length > 0 ? (
                                                depliee.modeleMetadata
                                                                    .filter(field => {
                                                                        // Exclure les champs système
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

                                                                        // Exclure les IDs (primary keys)
                                                                        const isIdField = field.name.startsWith('id_');

                                                                        return !excludedFields.includes(field.name) && !isIdField;
                                                                    })
                                                                    .map((field) => {
                                                                        const value = donnee[field.name];

                                                                        // ✅ Formater la valeur (ou afficher "Non renseigné")
                                                                        let displayValue;
                                                                        if (value === null || value === undefined || value === '') {
                                                                            displayValue = <em style={{ color: '#999' }}>Non renseigné</em>;
                                                                        } else if (typeof value === 'boolean') {
                                                                            displayValue = value ? 'Oui' : 'Non';
                                                                        } else if (Array.isArray(value)) {
                                                                            displayValue = value.join(', ');
                                                                        } else if (typeof value === 'object' && value !== null) {
                                                                            displayValue = value.value || JSON.stringify(value);
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
                                                                // Fallback si pas de metadata : afficher les données existantes uniquement
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
                                                                        if (value === null || value === undefined || value === '') {
                                                                            return null;
                                                                        }

                                                                        let displayValue;
                                                                        if (typeof value === 'boolean') {
                                                                            displayValue = value ? 'Oui' : 'Non';
                                                                        } else if (Array.isArray(value)) {
                                                                            displayValue = value.join(', ');
                                                                        } else if (typeof value === 'object' && value !== null) {
                                                                            displayValue = value.value || JSON.stringify(value);
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

                                                            {/* Séparateur entre les enregistrements */}
                                                            {depliee.donnees.length > 1 && dIdx < depliee.donnees.length - 1 && (
                                                                <div className="donnee-separator"></div>
                                                            )}
                                                        </div>
                                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-state">
                            <p className="empty-message">Aucune thématique associée</p>
                        </div>
                    )}
                                </div>
                            )}
                        </div>



                        {/* 5️⃣ DOCUMENTS */}
                        <div className="accordion-section">
                            <button
                                className={`accordion-header ${expandedSections.documents ? 'active' : ''}`}
                                onClick={() => toggleSection('documents')}
                            >
                                <span className="accordion-icon">{expandedSections.documents ? '▼' : '▶'}</span>
                                <span className="accordion-title">📄 Documents</span>
                                <span className="accordion-badge">{info.documents?.length || 0}</span>
                            </button>

                            {expandedSections.documents && (
                                <div className="accordion-content">
                                    {info.documents?.length > 0 ? (
                                        <div className="documents-list">
                                            {info.documents.map((doc, i) => (
                                                <div key={i} className="document-item">
                                                    <span className="document-icon">📎</span>
                                                    <div className="document-info">
                                                        {doc.lien_local && (
                                                            <div>
                                                                <span className="info-label">Fichier local : </span>
                                                                <p className="document-nom">{doc.lien_local}</p>
                                                            </div>
                                                        )}
                                                        {doc.lien_web && (
                                                            <div>
                                                                <span className="info-label">Lien web : </span>
                                                                <a
                                                                    className="document-link"
                                                                    href={doc.lien_web}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    {doc.lien_web}
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

                        {/* 6️⃣ GÉOMÉTRIES */}
                        <div className="accordion-section">
                            <button
                                className={`accordion-header ${expandedSections.geometries ? 'active' : ''}`}
                                onClick={() => toggleSection('geometries')}
                            >
                                <span className="accordion-icon">{expandedSections.geometries ? '▼' : '▶'}</span>
                                <span className="accordion-title">🗺️ Géométries</span>
                                <span className="accordion-badge">{info.geometries?.length || 0}</span>
                            </button>

                            {expandedSections.geometries && (
                                <div className="accordion-content">
                                    {info.geometries?.length > 0 ? (
                                        info.geometries.map((g, i) => {
                                            const listToText = (arr) => (arr || [])
                                                .map(it => typeof it === 'string' ? it : (it.nom || it.nomComplet || it.name || it.label || JSON.stringify(it)))
                                                .join(', ');

                                            return (
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

                                                    {Array.isArray(g.deputes) && g.deputes.length > 0 && (
                                                        <div className="geom-section">
                                                            <h5 className="geom-section-title">Députés</h5>
                                                            <div className="deputes-box"> {g.deputes.join(', ')}</div>
                                                        </div>
                                                    )}

                                                    {Array.isArray(g.maires) && g.maires.length > 0 && (
                                                        <div className="geom-section">
                                                            <h5 className="geom-section-title">Maires</h5>
                                                            <div className="maires-box">{g.maires.join(', ')}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="empty-state">
                                            <p className="empty-message">Aucune géométrie associée</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                    </>
                )}
            </div>
        </div>
    );
}