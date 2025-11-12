// frontend/src/visualisation/components/VueListe.js
import React, {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import { getStatusBadgeClass } from '../utils/statutColors';
import Pagination from './common/Pagination';
import DeletionRequestModal from './common/DeletionRequestModal';
import '../styles/VueListeStyle.css';

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
    const navigate = useNavigate()


    const handleClick = (p) => {
        onProjectSelect?.(p.id_projet);
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
              `http://localhost:3000/api/projets/${project.id_projet}/export?format=${format}`,
            {
                method: 'GET',
                headers: {
                'Content-Type': 'application/json',
                }
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

    const handleDeletionSubmit = async (raison) => {
        try {
            // Récupérer l'utilisateur actuel (à adapter selon votre système d'authentification)
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

            if (!currentUser.id_user) {
                throw new Error('Utilisateur non connecté');
            }

            const response = await fetch('http://localhost:3000/api/deletion-requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id_projet: projectToDelete.id_projet,
                    requested_by: currentUser.id_user,
                    raison: raison
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erreur lors de la soumission');
            }

            alert(`✅ Demande de suppression envoyée avec succès !\n\nVotre demande sera examinée par un administrateur.`);
            setDeletionModalOpen(false);
            setProjectToDelete(null);

        } catch (error) {
            console.error('❌ Erreur soumission demande:', error);
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

                    const serviceDDT = p.service_libelle || p.service || 'Non renseigné';
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

                                    {/* Bouton de suppression */}
                                    <button
                                        className="delete-btn-header"
                                        onClick={(e) => handleDeleteClick(e, p)}
                                        title="Demander la suppression du projet"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>

                            {/* BODY */}
                            <div className="project-card-body">
                                <div className="card-info-grid">
                                    {/* Nom du projet */}
                                    <div className="card-info-item full-width">
                                        <span className="card-info-icon">📝</span>
                                        <div className="card-info-content">
                                            <span className="card-info-label">Nom du projet</span>
                                            <span className="card-info-value">
                                                {p.nom_projet || `Projet ${p.id_projet}`}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div className="card-info-item full-width">
                                        <span className="card-info-icon">📄</span>
                                        <div className="card-info-content">
                                            <span className="card-info-label">Description</span>
                                            <span className="card-info-value">
                                                {p.description || <em style={{ color: '#999' }}>Aucune description renseignée</em>}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Type de porteur */}
                                    <div className="card-info-item">
                                        <span className="card-info-icon">👥</span>
                                        <div className="card-info-content">
                                            <span className="card-info-label">Porteur</span>
                                            <span className="card-info-value">
                                                {nombrePorteurs} porteur{nombrePorteurs > 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </div>


                                    {/* Service DDT */}
                                    {serviceDDT && (
                                        <div className="card-info-item">
                                            <span className="card-info-icon">🏛️</span>
                                            <div className="card-info-content">
                                                <span className="card-info-label">Service DDT</span>
                                                <span className="card-info-value">{serviceDDT}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Thématiques - Toujours affiché */}
                                    <div className="card-info-item">
                                        <span className="card-info-icon">🎯</span>
                                        <div className="card-info-content">
                                            <span className="card-info-label">Thématiques</span>
                                            <span className="card-info-value">
                                                {nombreThematiques > 0
                                                    ? `${nombreThematiques} thématique${nombreThematiques > 1 ? 's' : ''}`
                                                    : <em style={{ color: '#999' }}>Aucune thématique pour ce projet</em>
                                                }
                                            </span>
                                        </div>
                                    </div>

                                    {/* Communes - Toujours affiché */}
                                    <div className="card-info-item full-width">
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

                                {/* Badges projet signalé / Charte d'accueil */}
                                {(p.projet_signale || p.charte_accueil) && (
                                    <div className="project-badges">
                                        {p.projet_signale && (
                                            <span className="badge badge-signale">🚨 Projet signalé</span>
                                        )}
                                        {p.charte_accueil && (
                                            <span className="badge badge-charte">✅ Charte d'accueil</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* ✅ FOOTER: Date de modification + Bouton Modifier */}
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
        </>
    );
}
