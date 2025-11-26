// frontend/src/visualisation/pages/ListeProjetPage.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MapFilters from '../components/MapFilters';
import VueListe from '../components/VueListe';
import ProjetDetailPanel from '../components/common/ProjetDetailPanel';
import { useProjetDetails } from '../hooks/useProjetDetails';
import { useAccordion } from '../hooks/useAccordion';
import styles from '../styles/MapFilters.module.css';
import '../styles/VueListeStyle.css';
import { filterProjectsArray } from '../utils/ProjectFilters';



export default function ListeProjetPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({});
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [geoEntities, setGeoEntities] = useState([]);

    // ✅ État de pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 4; // 4 projets par page

    // Hooks personnalisés
    const [selectedProjectDetails, setSelectedProjectDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const { expandedSections, toggleSection } = useAccordion({
        infos: true,
        suivis: false,
        porteurs: false,
        thematiques: true,
        documents: false,
        geometries: false
    });

    const handleProjectSelect = async (projectId) => {
        setSelectedProjectId(projectId);
        setLoadingDetails(true);
        
        try {
            const response = await fetch(`http://localhost:3000/api/projets/${projectId}`);
            if (!response.ok) throw new Error('Erreur chargement projet');
            
            const result = await response.json();
            
            // ✅ Extraire les données du wrapper
            const data = result.data || result;  
            
            console.log('🔍 Données projet extraites:', data);
            console.log('🔍 Vérification:', {
                id_projet: data.id_projet,
                nom_projet: data.nom_projet,
                nbThematiques: data.thematiques?.length,
                nbPorteurs: data.porteurs?.length,
                porteursData: data.porteurs
            });
            
            setSelectedProjectDetails(data);
        } catch (error) {
            console.error('❌ Erreur:', error);
            setSelectedProjectDetails(null);
        } finally {
            setLoadingDetails(false);
        }
    };


    // Charger les projets
    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const res = await fetch('http://localhost:3000/api/projet-geometry?format=geojson&limit=1000');
                if (!res.ok) throw new Error(`Erreur ${res.status}`);
                const featureCollection = await res.json();
                const projectsList = featureCollection.features.map(f => ({
                    id_projet: f.properties.id_projet,
                    ...f.properties
                }));
                setProjects(projectsList);
                console.log('✅ Projets chargés:', projectsList.length);
            } catch (e) {
                console.error('❌ Erreur chargement projets:', e);
                setProjects([]);
            } finally {
                setLoading(false);
            }
        };
        load();

        // 🔥 AJOUT : Rafraîchir les données quand la fenêtre reprend le focus
        const handleFocus = () => {
            console.log('🔄 Fenêtre en focus - Rafraîchissement des projets...');
            load();
        };

        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    // Charger communes
    useEffect(() => {
        const run = async () => {
            try {
                const res = await fetch('http://localhost:3000/api/geo-entities');
                if (res.ok) setGeoEntities(await res.json());
            } catch {}
        };
        run();
    }, []);

    // Filtrer les projets
    const filteredProjects = useMemo(() => {
        console.log('🔄 Recalcul des projets filtrés (Liste)');
        return filterProjectsArray(projects, filters, true); 
    }, [projects, filters]);

    // ✅ Réinitialiser la pagination quand les filtres changent
    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    const handleFilterChange = useCallback((next) => {
        setFilters(next || {});
    }, []);

    const goToCarte = useCallback(() => {
        const qs = searchParams.toString();
        navigate(`/projets/carte${qs ? `?${qs}` : ''}`);
    }, [navigate, searchParams]);

    const handleCloseDetail = useCallback(() => {
        setSelectedProjectId(null);
    }, []);

    // ✅ Gérer le changement de page
    const handlePageChange = useCallback((newPage) => {
        setCurrentPage(newPage);
        // Scroll vers le haut quand on change de page
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const viewToggleButton = (
        <button className={styles.viewToggleButton} onClick={goToCarte}>
            🗺️ Vue Carte
        </button>
    );

    return (
        <div className="vue-liste-container">
            <div className="vue-liste-header">
                <div className="vue-liste-title">
                    Liste des projets
                    <span className="project-count">{filteredProjects.length} éléments</span>
                </div>
            </div>

            <MapFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                communes={geoEntities}
                viewToggleButton={viewToggleButton}
            />

            <div className={`vue-liste-split ${selectedProjectId ? 'with-detail' : ''}`}>
                <div className="vue-liste-left">
                    <VueListe
                        projects={filteredProjects}
                        loading={loading}
                        onProjectSelect={handleProjectSelect}
                        selectedProjectId={selectedProjectId}
                        currentPage={currentPage}
                        itemsPerPage={itemsPerPage}
                        onPageChange={handlePageChange}
                    />
                </div>

                {selectedProjectId && (
                    <ProjetDetailPanel
                        selectedProjectDetails={selectedProjectDetails} 
                        loadingDetails={loadingDetails}
                        expandedSections={expandedSections}
                        onToggleSection={toggleSection}
                        onClose={() => setSelectedProjectId(null)}
                    />
                )}
            </div>
        </div>
    );
}