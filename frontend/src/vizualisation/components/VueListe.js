// frontend/src/visualisation/components/VueListe.js
import React, {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import { getStatusBadgeClass } from '../utils/statutColors';
import Pagination from './common/Pagination';
import DeletionRequestModal from './common/DeletionRequestModal';
import ArchiveRequestModal from './common/ArchiveRequestModal';
import { formatDateTimeFr } from '../../utils/dateFormatter';
import '../styles/VueListeStyle.css';
import { API_BASE_URL } from '../../config/apiConfig';
import { getApiHeaders } from '../../utils/userHelper';

export default function VueListe({
    projects,
    onProjectSelect,
    loading,
    selectedProjectId,
    currentPage,
    itemsPerPage,
    onPageChange
}) {
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [selectedFormat, setSelectedFormat] = useState('pdf');
    const [downloading, setDownloading] = useState(false);
    const [deletionModalOpen, setDeletionModalOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [archiveModalOpen, setArchiveModalOpen] = useState(false);
    const [archiveRequestTarget, setArchiveRequestTarget] = useState(null);
    const navigate = useNavigate()


    const handleClick = (p, sectionToOpen = null) => {
        onProjectSelect?.(p.id_projet, sectionToOpen);
    };

    const handleSectionClick = (e, p, sectionName) => {
        e.stopPropagation();
        onProjectSelect?.(p.id_projet, sectionName);
    };

    const handleDownloadClick = (e, projectId) => {
        e.stopPropagation();
        setOpenDropdownId(openDropdownId === projectId ? null : projectId);
        setSelectedFormat('pdf'); // Reset format
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (openDropdownId && !e.target.closest('.download-dropdown-container')) {
                setOpenDropdownId(null);
            }
        };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
    }, [openDropdownId]);


    const handleFormatSelect = async (e, project, format) => {
        e.stopPropagation();
        setDownloading(true);

        try {
            const response = await fetch(
              `${API_BASE_URL}/api/projets/${project.id_projet}/export?format=${format}`,
            {
                method: 'GET',
                headers: getApiHeaders()
            }
            );

            if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Erreur ${response.status}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `projet_${project.id_projet}_${project.nom_projet || 'export'}.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setOpenDropdownId(null);
        } catch (error) {
            console.error('❌ Erreur téléchargement:', error);

            let errorMessage = 'Erreur lors du téléchargement';
            if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Serveur inaccessible. Vérifiez que le backend est démarré.';
            } else if (error.message) {
            errorMessage = error.message;
            }

            alert(errorMessage);
            setOpenDropdownId(null);
        } finally {
            setDownloading(false);
        }
    };

    const handleDeleteClick = (e, project) => {
        e.stopPropagation();
        setProjectToDelete(project);
        setDeletionModalOpen(true);
    };

    const handleArchiveClick = (e, project, requestType) => {
        e.stopPropagation();
        setArchiveRequestTarget({ project, requestType });
        setArchiveModalOpen(true);
    };

    const handleArchiveSubmit = async (raison) => {
        if (!archiveRequestTarget?.project?.id_projet) {
            return;
        }

        const { project, requestType } = archiveRequestTarget;
        const isRestore = requestType === 'restauration';

        try {
            const response = await fetch(`${API_BASE_URL}/api/archive-requests`, {
                method: 'POST',
                headers: getApiHeaders(),
                body: JSON.stringify({
                    id_projet: project.id_projet,
                    request_type: requestType,
                    raison: raison || null
                })
            });

            const result = await response.json();
            if (!response.ok) {
                const errorMsg = result.error || result.message || 'Erreur lors de la soumission';
                alert(`❌ Erreur: ${errorMsg}`);
                throw new Error(errorMsg);
            }

            alert(
                isRestore
                    ? '✅ Demande de restauration envoyée avec succès !'
                    : '✅ Demande d\'archivage envoyée avec succès !'
            );

            setArchiveModalOpen(false);
            setArchiveRequestTarget(null);
            window.location.reload();
        } catch (error) {
            console.error('❌ Erreur demande archivage/restauration:', error);
            throw error;
        }
    };

    const handleDeletionSubmit = async (raison) => {
        try {
            // Récupérer l'utilisateur actuel (à adapter selon votre système d'authentification)
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

            console.log('📋 Données de soumission:', {
                projet: projectToDelete?.id_projet,
                user: currentUser?.id_user,
                raison: raison
            });

            if (!currentUser.id_user) {
                alert('❌ Erreur: Utilisateur non connecté. Veuillez vous reconnecter.');
                throw new Error('Utilisateur non connecté');
            }

            const response = await fetch(`${API_BASE_URL}/api/deletion-requests`, {
                method: 'POST',
                headers: getApiHeaders(),
                body: JSON.stringify({
                    id_projet: projectToDelete.id_projet,
                    raison: raison
                })
            });

            const result = await response.json();
            console.log('📡 Réponse du serveur:', result);

            if (!response.ok) {
                const errorMsg = result.error || result.message || 'Erreur lors de la soumission';
                alert(`❌ Erreur: ${errorMsg}`);
                throw new Error(errorMsg);
            }

            alert(`✅ Demande de suppression envoyée avec succès !\n\nVotre demande sera examinée par un administrateur.`);
            setDeletionModalOpen(false);
            setProjectToDelete(null);

            // Recharger la page pour afficher le bandeau d'avertissement
            window.location.reload();

        } catch (error) {
            console.error('❌ Erreur soumission demande:', error);
            console.error('❌ Détails:', error.message);
            throw error;
        }
    };

    if (loading) {
        return (
            <div className="vue-liste-loading">
                <div className="spinner" />
                <p>Chargement des projets...</p>
            </div>
        );
    }

    if (!projects || projects.length === 0) {
        return (
            <div className="vue-liste-empty">
                <p>Aucun projet trouvé</p>
                <small>Essayez de modifier vos filtres de recherche</small>
            </div>
        );
    }

    const formatCommunes = (communes) => {
        if (!communes) return null;
        if (Array.isArray(communes)) return communes;
        if (typeof communes === 'string') {
            return communes.split(',').map(c => c.trim()).filter(Boolean);
        }
        return [communes];
    };

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProjects = projects.slice(startIndex, endIndex);
    const totalPages = Math.ceil(projects.length / itemsPerPage);

    return (
        <>
            <div className="vue-liste-grid">
                {paginatedProjects.map((p) => {
                    console.log(`\n🔍 PROJET: ${p.id_projet}`);
                    console.log('  - Données brutes du projet:', p);

                    const isSelected = String(selectedProjectId) === String(p.id_projet);
                    const statut = p.libelle_statut || p.statut_projet || p.statut || 'NC';
                    const badgeClass = getStatusBadgeClass(statut);
                    const nombreThematiques = p.nombre_thematiques ?? p.thematiques_count ?? 0;
                    const communesArray = formatCommunes(p.communes_traversees);
                    const nombrePorteurs = p.nb_porteurs ?? 0;
                    const isArchived = !!p.is_archived;
                    const archiveRequestPending = !!p.demande_archivage;
                    const restoreRequestPending = !!p.demande_restauration;

                    const serviceReferent = p.service_libelle || p.service || 'Non renseigné';
                    const isDropdownOpen = openDropdownId === p.id_projet;

                    return (
                        <div
                            key={p.id_projet}
                            className={`project-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleClick(p)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick(p)}
                        >
                            {/* HEADER */}
                            <div className="project-card-header">
                                <div className="project-card-title-section">
                                    <span className="project-id">#{p.id_projet}</span>
                                </div>

                                {/* Groupe badge statut + bouton téléchargement */}
                                <div className="header-actions">
                                    <span className={`badge ${badgeClass}`}>{statut}</span>

                                    {/* Dropdown de téléchargement */}
                                    <div className="download-dropdown-container">
                                        <button
                                            className={`download-btn-header ${isDropdownOpen ? 'active' : ''}`}
                                            onClick={(e) => handleDownloadClick(e, p.id_projet)}
                                            title="Télécharger le projet"
                                            disabled={downloading}
                                        >
                                            📥
                                        </button>

                                        {isDropdownOpen && (
                                            <div className="download-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                                                <div className="dropdown-header">
                                                    <span className="dropdown-title">Format d'export</span>
                                                    <button
                                                        className="dropdown-close"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenDropdownId(null);
                                                        }}
                                                    >
                                                        ×
                                                    </button>
                                                </div>

                                                <div className="dropdown-options">
                                                    <button
                                                        className="dropdown-option"
                                                        onClick={(e) => handleFormatSelect(e, p, 'pdf')}
                                                        disabled={downloading}
                                                    >
                                                        <span className="option-icon">📄</span>
                                                        <div className="option-content">
                                                            <span className="option-name">PDF</span>
                                                            <span className="option-desc">Document complet</span>
                                                        </div>
                                                    </button>

                                                    <button
                                                        className="dropdown-option"
                                                        onClick={(e) => handleFormatSelect(e, p, 'csv')}
                                                        disabled={downloading}
                                                    >
                                                        <span className="option-icon">📊</span>
                                                        <div className="option-content">
                                                            <span className="option-name">CSV</span>
                                                            <span className="option-desc">Données tabulaires</span>
                                                        </div>
                                                    </button>

                                                    <button
                                                        className="dropdown-option"
                                                        onClick={(e) => handleFormatSelect(e, p, 'geojson')}
                                                        disabled={downloading}
                                                    >
                                                        <span className="option-icon">🗺️</span>
                                                        <div className="option-content">
                                                            <span className="option-name">GeoJSON</span>
                                                            <span className="option-desc">Données géographiques</span>
                                                        </div>
                                                    </button>
                                                </div>

                                                {downloading && (
                                                    <div className="dropdown-loading">
                                                        <div className="mini-spinner"></div>
                                                        <span>Téléchargement...</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* BODY */}
                            <div className="project-card-body">
                                <div className="card-info-grid">
                                    {/* Nom du projet */}
                                    <div
                                        className="card-info-item full-width clickable-section"
                                        onClick={(e) => handleSectionClick(e, p, 'infos')}
                                        style={{ cursor: 'pointer' }}
                                        title="Cliquer pour voir les informations générales"
                                    >
                                        <span className="card-info-icon">📝</span>
                                        <div className="card-info-content">
                                            <span className="card-info-label">Nom du projet</span>
                                            <span className="card-info-value">
                                                {p.nom_projet || `Projet ${p.id_projet}`}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div
                                        className="card-info-item full-width clickable-section"
                                        onClick={(e) => handleSectionClick(e, p, 'infos')}
                                        style={{ cursor: 'pointer' }}
                                        title="Cliquer pour voir les informations générales"
                                    >
                                        <span className="card-info-icon">📄</span>
                                        <div className="card-info-content">
                                            <span className="card-info-label">Description</span>
                                            <span className="card-info-value">
                                                {p.description || <em style={{ color: '#999' }}>Aucune description renseignée</em>}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Ligne: Porteur | Service Référent | Thématiques */}
                                    <div className="card-info-item full-width card-info-row-wrapper">
                                        <div className="card-info-row">
                                            {/* Porteur */}
                                            <div
                                                className="card-info-item-inline clickable-section"
                                                onClick={(e) => handleSectionClick(e, p, 'porteurs')}
                                                style={{ cursor: 'pointer' }}
                                                title="Cliquer pour voir les porteurs du projet"
                                            >
                                                <span className="card-info-icon">👥</span>
                                                <div className="card-info-content">
                                                    <span className="card-info-label">Porteur</span>
                                                    <span className="card-info-value">
                                                        {nombrePorteurs}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Séparateur */}
                                            <span className="card-info-separator">|</span>

                                            {/* Service Référent */}
                                            <div
                                                className="card-info-item-inline clickable-section"
                                                onClick={(e) => handleSectionClick(e, p, 'suivis')}
                                                style={{ cursor: 'pointer' }}
                                                title="Cliquer pour voir les suivis"
                                            >
                                                <span className="card-info-icon">🏛️</span>
                                                <div className="card-info-content">
                                                    <span className="card-info-label">Service Référent</span>
                                                    <span className="card-info-value">{serviceReferent}</span>
                                                </div>
                                            </div>

                                            {/* Séparateur */}
                                            <span className="card-info-separator">|</span>

                                            {/* Thématiques */}
                                            <div
                                                className="card-info-item-inline clickable-section"
                                                onClick={(e) => handleSectionClick(e, p, 'thematiques')}
                                                style={{ cursor: 'pointer' }}
                                                title="Cliquer pour voir les thématiques"
                                            >
                                                <span className="card-info-icon">🎯</span>
                                                <div className="card-info-content">
                                                    <span className="card-info-label">Thématiques</span>
                                                    <span className="card-info-value">
                                                        {nombreThematiques}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Communes - Toujours affiché */}
                                    <div
                                        className="card-info-item full-width clickable-section"
                                        onClick={(e) => handleSectionClick(e, p, 'geometries')}
                                        style={{ cursor: 'pointer' }}
                                        title="Cliquer pour voir les géométries"
                                    >
                                        <span className="card-info-icon">📍</span>
                                        <div className="card-info-content">
                                            <span className="card-info-label">
                                                {(() => {
                                                    // Déterminer le label selon le type de géométrie
                                                    const geomType = p.geom_type || p.geometry_type;

                                                    if (!geomType || !communesArray || communesArray.length === 0) {
                                                        // Pas de géométrie
                                                        return 'Commune';
                                                    }

                                                    const geomTypeLower = geomType.toLowerCase();

                                                    if (geomTypeLower === 'point') {
                                                        // Point : singulier
                                                        return 'Commune';
                                                    } else if (geomTypeLower === 'linestring' || geomTypeLower === 'line' ||
                                                               geomTypeLower === 'polygon' || geomTypeLower === 'multipolygon' ||
                                                               geomTypeLower === 'multilinestring') {
                                                        // Ligne ou Polygone : pluriel
                                                        return 'Communes traversées';
                                                    }

                                                    // Par défaut
                                                    return 'Commune';
                                                })()}
                                            </span>
                                            {communesArray && communesArray.length > 0 ? (
                                                <div className="communes-inline">
                                                    {communesArray.map((commune, idx) => (
                                                        <React.Fragment key={idx}>
                                                            <span className="commune-name">{commune}</span>
                                                            {idx < communesArray.length - 1 && (
                                                                <span className="commune-separator">•</span>
                                                            )}
                                                        </React.Fragment>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="card-info-value" style={{ color: '#999', fontStyle: 'italic' }}>
                                                    Aucune géométrie renseignée
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Badges projet signalé / Charte d'accueil / Demandes / Archive */}
                                {(p.projet_signale || p.charte_accueil || p.demande_suppression || archiveRequestPending || restoreRequestPending || isArchived) && (
                                    <div className="project-badges">
                                        {p.projet_signale && (
                                            <span className="badge badge-signale">🚨 Projet signalé</span>
                                        )}
                                        {p.charte_accueil && (
                                            <span className="badge badge-charte">✅ Charte d'accueil</span>
                                        )}
                                        {p.demande_suppression && (
                                            <span className="badge badge-suppression">⏳ En attente de suppression</span>
                                        )}
                                        {archiveRequestPending && (
                                            <span className="badge badge-suppression">⏳ En attente d'archivage</span>
                                        )}
                                        {restoreRequestPending && (
                                            <span className="badge badge-suppression">⏳ En attente de restauration</span>
                                        )}
                                        {isArchived && (
                                            <span className="badge badge-archived">🗃️ Projet archivé</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* ✅ FOOTER: Date de modification + Boutons d'action */}
                            <div className="project-card-footer">
                                <div className="footer-left">
                                    {p.date_maj || p.updated_at ? (
                                        <div className="last-update-info">
                                            <span className="update-label">Dernière modification:</span>
                                            <span className="update-date">
                                                {new Date(p.date_maj || p.updated_at).toLocaleString('fr-FR', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    second: '2-digit'
                                                })}
                                            </span>
                                            {(p.updated_by_name || p.modifier_nom) && (
                                                <span className="update-author">
                                                    par {p.updated_by_name || p.modifier_nom}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="last-update-info">
                                            <span className="update-label">Créé le:</span>
                                            <span className="update-date">
                                                {p.date_creation || p.created_at ?
                                                    new Date(p.date_creation || p.created_at).toLocaleDateString('fr-FR', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric'
                                                    })
                                                    : 'N/A'
                                                }
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="footer-actions" style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        className={`badge ${isArchived ? 'badge-restore-request' : 'badge-archive-request'} ${(archiveRequestPending || restoreRequestPending) ? 'disabled' : ''}`}
                                        onClick={(e) => {
                                            const requestType = isArchived ? 'restauration' : 'archivage';
                                            const isDisabled = isArchived ? restoreRequestPending : archiveRequestPending;
                                            if (!isDisabled) {
                                                handleArchiveClick(e, p, requestType);
                                            } else {
                                                e.stopPropagation();
                                            }
                                        }}
                                        disabled={isArchived ? restoreRequestPending : archiveRequestPending}
                                        title={
                                            isArchived
                                                ? (restoreRequestPending
                                                    ? 'Une demande de restauration est déjà en attente'
                                                    : 'Demande de restauration')
                                                : (archiveRequestPending
                                                    ? 'Une demande d\'archivage est déjà en attente'
                                                    : 'Demande d\'archivage')
                                        }
                                        aria-label={
                                            isArchived
                                                ? (restoreRequestPending ? 'Demande de restauration en attente' : 'Demande de restauration')
                                                : (archiveRequestPending ? 'Demande d\'archivage en attente' : 'Demande d\'archivage')
                                        }
                                    >
                                        {isArchived
                                            ? (restoreRequestPending ? '⏳' : '♻️')
                                            : (archiveRequestPending ? '⏳' : '🗃️')}
                                    </button>

                                    {/* Bouton modifier */}
                                    <button
                                        className="badge badge-edit edit-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/projets/edit/${p.id_projet}`);
                                        }}
                                        title="Modifier le projet"
                                    >
                                        <span className="icon-pencil" aria-hidden="true">✏️</span> Modifier
                                    </button>

                                    {/* Bouton supprimer */}
                                    <button
                                        className={`badge badge-delete ${p.demande_suppression ? 'disabled' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            !p.demande_suppression && handleDeleteClick(e, p);
                                        }}
                                        title={p.demande_suppression ? "Une demande de suppression est déjà en attente" : "Supprimer le projet"}
                                        disabled={p.demande_suppression}
                                        style={{
                                            backgroundColor: p.demande_suppression ? '#E5E7EB' : '#EF4444',
                                            color: 'white',
                                            cursor: p.demande_suppression ? 'not-allowed' : 'pointer',
                                            opacity: p.demande_suppression ? 0.5 : 1,
                                            minWidth: '40px',
                                            padding: '0.5rem'
                                        }}
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={projects.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={onPageChange}
                />
            )}

            {/* Modal de demande de suppression */}
            {deletionModalOpen && projectToDelete && (
                <DeletionRequestModal
                    projet={projectToDelete}
                    onClose={() => {
                        setDeletionModalOpen(false);
                        setProjectToDelete(null);
                    }}
                    onSubmit={handleDeletionSubmit}
                />
            )}

            {/* Modal de demande d'archivage / restauration */}
            {archiveModalOpen && archiveRequestTarget && (
                <ArchiveRequestModal
                    projet={archiveRequestTarget.project}
                    requestType={archiveRequestTarget.requestType}
                    onClose={() => {
                        setArchiveModalOpen(false);
                        setArchiveRequestTarget(null);
                    }}
                    onSubmit={handleArchiveSubmit}
                />
            )}
        </>
    );
}
