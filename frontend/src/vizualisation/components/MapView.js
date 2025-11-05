// frontend/src/visualisation/components/MapView.js
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/MapStyle.css';
import changelayout from '../../../src/assets/changelayout.svg';
import MapFilters from './MapFilters';
import Sidebar from './Sidebar';
import { getStatusStyle } from '../utils/statutColors';
import styles from '../styles/MapFilters.module.css';
import { filterProjects } from '../utils/ProjectFilters';

const EURE_ET_LOIR_CENTER = [48.5525242, 1.1989814];
const EURE_ET_LOIR_BOUNDS = [[47.95, 0.45], [48.95, 1.99]];

const baseLayers = {
    plan: L.tileLayer(
        'https://data.geopf.fr/wmts?&REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
        { minZoom: 0, maxZoom: 19, attribution: 'IGN-F/Geoportail', tileSize: 256 }
    ),
    ortho: L.tileLayer(
        'https://data.geopf.fr/wmts?&REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
        { minZoom: 0, maxZoom: 19, attribution: 'IGN-F/Geoportail', tileSize: 256 }
    ),
};

export default function Map({ onSelect }) {
    const mapDiv = useRef(null);
    const mapRef = useRef(null);
    const geoJsonLayerRef = useRef(null);
    const locationMarkerRef = useRef(null);
    const currentLayerRef = useRef(null);
    const invalidateSizeTimeoutRef = useRef(null);

    const [layerKey, setLayerKey] = useState('plan');
    const [allProjects, setAllProjects] = useState({ type: 'FeatureCollection', features: [] });
    const [filters, setFilters] = useState({});
    const [geoEntities, setGeoEntities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedProjectId, setSelectedProjectId] = useState(null);

     // Appliquer les filtres aux projets
    const filteredProjects = useMemo(() => {
        console.log('🔄 Recalcul des projets filtrés');
        return filterProjects(allProjects, filters, true);
    }, [allProjects, filters]);

    const navigate = useNavigate();
    const location = useLocation();

    const goToListe = () => {
        const params = new URLSearchParams();
        if (filters.searchText) params.set('q', filters.searchText);
        if (filters.searchCodeInsee) params.set('insee', filters.searchCodeInsee);
        if (filters.searchEpci) params.set('epci', filters.searchEpci);
        if (filters.searchArrondissement) params.set('arr', filters.searchArrondissement);
        if (filters.serviceIds?.length) params.set('services', filters.serviceIds.join(','));
        if (filters.thematiqueIds?.length) params.set('thematiques', filters.thematiqueIds.join(','));
        if (filters.projetSignale) params.set('signale', '1');
        if (filters.charteAccueil) params.set('charte', '1');
        navigate(`/projets/liste?${params.toString()}`, { replace: false, state: { from: location.pathname } });
    };

    const toggleLayer = () => setLayerKey(prev => (prev === 'plan' ? 'ortho' : 'plan'));
    const handleFilterChange = useCallback((newFilters) => setFilters(newFilters || {}), []);

    // 🔧 Helper sécurisé pour invalidateSize
    const safeInvalidateSize = useCallback(() => {
        if (invalidateSizeTimeoutRef.current) {
            clearTimeout(invalidateSizeTimeoutRef.current);
        }

        invalidateSizeTimeoutRef.current = setTimeout(() => {
            if (mapRef.current && mapDiv.current) {
                try {
                    const container = mapRef.current.getContainer();
                    if (container && container.offsetWidth > 0 && container.offsetHeight > 0) {
                        mapRef.current.invalidateSize();
                        console.log('✅ invalidateSize() effectué');
                    } else {
                        console.warn('⚠️ Conteneur sans dimensions, invalidateSize ignoré');
                    }
                } catch (e) {
                    console.warn('⚠️ Erreur invalidateSize:', e.message);
                }
            }
        }, 100);
    }, []);

    // 🔧 Initialiser la carte
    useEffect(() => {
        if (!mapDiv.current || mapRef.current) {
            return;
        }

        try {
            console.log('🗺️ Initialisation de la carte Leaflet...');

            const map = L.map(mapDiv.current, {
                center: EURE_ET_LOIR_CENTER,
                zoom: 10,
                maxBounds: EURE_ET_LOIR_BOUNDS,
                maxBoundsViscosity: 1.0,
                zoomControl: true,
                preferCanvas: false,
            });

            const initialLayer = baseLayers.plan;
            initialLayer.addTo(map);
            currentLayerRef.current = initialLayer;
            mapRef.current = map;

            map.whenReady(() => {
                console.log('✅ Carte prête');
                safeInvalidateSize();
            });

        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation de la carte:', error);
            setError('Erreur d\'initialisation de la carte');
        }

        return () => {
            if (invalidateSizeTimeoutRef.current) {
                clearTimeout(invalidateSizeTimeoutRef.current);
            }
            if (mapRef.current) {
                console.log('🧹 Nettoyage de la carte');
                try {
                    mapRef.current.off();
                    mapRef.current.remove();
                } catch (e) {
                    console.warn('Erreur lors du nettoyage:', e);
                }
                mapRef.current = null;
            }
        };
    }, [safeInvalidateSize]);

    // 🔧 Changer la couche de base
    useEffect(() => {
        if (!mapRef.current) return;

        const map = mapRef.current;
        const newLayer = baseLayers[layerKey];

        if (currentLayerRef.current) {
            try {
                map.removeLayer(currentLayerRef.current);
            } catch (e) {
                console.warn('Erreur changement de couche:', e);
            }
        }

        newLayer.addTo(map);
        currentLayerRef.current = newLayer;
        console.log(`🎨 Couche changée: ${layerKey}`);
    }, [layerKey]);

    // 🔧 Réajuster la taille quand la sidebar change
    useEffect(() => {
        if (!mapRef.current) return;

        const timer = setTimeout(() => {
            safeInvalidateSize();
        }, 350);

        return () => clearTimeout(timer);
    }, [selectedProjectId, safeInvalidateSize]);

    // Charger données géo (communes)
    useEffect(() => {
        const run = async () => {
            try {
                const res = await fetch('http://localhost:3000/api/geo-entities');
                if (res.ok) {
                    const data = await res.json();
                    setGeoEntities(data);
                    console.log('✅ Entités géographiques chargées:', data.length);
                }
            } catch (e) {
                console.error('❌ Erreur chargement geo-entities:', e);
            }
        };
        run();
    }, []);

    // Charger projets
    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await fetch('http://localhost:3000/api/projet-geometry?format=geojson&limit=1000');
                if (!res.ok) throw new Error(`Erreur ${res.status}`);
                const featureCollection = await res.json();
                setAllProjects(featureCollection || { type: 'FeatureCollection', features: [] });
                console.log('✅ Projets chargés:', featureCollection.features.length);

                // ✅ DEBUG : Vérifier les statuts des premiers projets
                if (featureCollection.features && featureCollection.features.length > 0) {
                    console.log('🔍 ANALYSE DES STATUTS DES PREMIERS PROJETS:');
                    featureCollection.features.slice(0, 3).forEach((f, i) => {
                        const p = f.properties;
                        console.log(`  [${i}] ${p.nom_projet}:`);
                        console.log('    - statut:', p.statut);
                        console.log('    - statut_projet:', p.statut_projet);
                        console.log('    - libelle_statut:', p.libelle_statut);
                        console.log('    - statut_projet_id:', p.statut_projet_id);
                        console.log('    - Toutes les clés contenant "statut":',
                            Object.keys(p).filter(k => k.toLowerCase().includes('statut'))
                        );
                    });
                }
            } catch (e) {
                console.error('❌ Erreur chargement projets:', e);
                setError(e.message || 'Erreur de chargement');
                setAllProjects({ type: 'FeatureCollection', features: [] });
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // 🎨 Rendu des projets avec couleurs par statut
    const renderProjects = useCallback((featureCollection) => {
            if (!mapRef.current) {
                console.warn('⚠️ Carte non initialisée');
                return;
            }

            const map = mapRef.current;

            if (geoJsonLayerRef.current) {
                try {
                    map.removeLayer(geoJsonLayerRef.current);
                } catch (e) {
                    console.warn('Erreur suppression couche:', e);
                }
            }

            if (!featureCollection?.features?.length) {
                console.log('ℹ️ Aucun projet à afficher');
                return;
            }

            try {
                const geoJsonLayer = L.geoJSON(featureCollection, {
                    style: (feature) => {
                        const statut = feature.properties?.libelle_statut || 
                            feature.properties?.statut_projet || 
                            feature.properties?.statut || 'Non défini';
                        const style = getStatusStyle(statut);
                        return {
                            color: style.color,
                            weight: 3,
                            opacity: 0.8,
                            fillColor: style.fillColor,
                            fillOpacity: 0.4
                        };
                    },
                    pointToLayer: (feature, latlng) => {
                        const statut = feature.properties?.libelle_statut || 
                             feature.properties?.statut_projet || 
                            feature.properties?.statut || 'Non défini';
                        const style = getStatusStyle(statut);
                        return L.circleMarker(latlng, {
                            radius: 8,
                            fillColor: style.fillColor,
                            color: '#000',
                            weight: 1,
                            opacity: 1,
                            fillOpacity: 0.8
                        });
                    },
                    onEachFeature: (feature, layer) => {
                        const props = feature.properties;
                        const geom = feature.geometry;

                        // Récupération des données
                        const idProjet = props.id_projet || props.idprojet || 'N/A';
                        const nomProjet = props.nom_projet || props.nomprojet || 'Projet sans nom';
                        const description = props.description || 'Aucune description'
                        const statut = props.libelle_statut || props.statut_projet || props.statut || 'Aucun statut';
                        const serviceDDT = props.service || props.service_ddt || 'Aucun service';
                        
                        // Communes
                        let communesText = 'Non renseignée';
                        if (props.communes_traversees && Array.isArray(props.communes_traversees)) {
                            const communes = props.communes_traversees;
                            if (communes.length === 1) {
                                communesText = communes[0];
                            } else if (communes.length <= 3) {
                                communesText = communes.join(', ');
                            } else {
                                communesText = `${communes.slice(0, 3).join(', ')} +${communes.length - 3} autres`;
                            }
                        } else if (props.commune) {
                            communesText = props.commune;
                        }

                        // Type de porteur
                        let typePorteur = 'Aucun type de porteur renseigné';
                        if (props.porteurs && Array.isArray(props.porteurs) && props.porteurs.length > 0) {
                            const types = props.porteurs
                                .map(p => p.type_porteur)
                                .filter(t => t)
                                .join(', ');
                            typePorteur = types || 'Aucun type';
                        } else if (props.type_porteur) {
                            typePorteur = props.type_porteur;
                        }

                        // Superficie ou longueur
                        let dimensionText = '';
                        if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
                            const superficie = props.surface || props.superficie;
                            if (superficie) {
                                const surfaceFormatted = Number(superficie).toLocaleString('fr-FR', {
                                    maximumFractionDigits: 0
                                });
                                dimensionText = `
                                    <div style="display: flex; align-items: flex-start; gap: 8px;">
                                        <span style="font-size: 16px;">📐</span>
                                        <div style="flex: 1;">
                                            <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 2px;">SUPERFICIE</div>
                                            <div style="
                                                display: inline-block;
                                                padding: 4px 10px;
                                                background: #fef3c7;
                                                color: #92400e;
                                                border-radius: 6px;
                                                font-size: 13px;
                                                font-weight: 700;
                                                border: 1px solid #fbbf24;
                                            ">${surfaceFormatted} m²</div>
                                        </div>
                                    </div>
                                `;
                            }
                        } else if (geom.type === 'LineString' || geom.type === 'MultiLineString') {
                            const longueur = props.longueur || props.length;
                            if (longueur) {
                                const longueurFormatted = Number(longueur).toLocaleString('fr-FR', {
                                    maximumFractionDigits: 0
                                });
                                dimensionText = `
                                    <div style="display: flex; align-items: flex-start; gap: 8px;">
                                        <span style="font-size: 16px;">📏</span>
                                        <div style="flex: 1;">
                                            <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 2px;">LONGUEUR</div>
                                            <div style="
                                                display: inline-block;
                                                padding: 4px 10px;
                                                background: #fef3c7;
                                                color: #92400e;
                                                border-radius: 6px;
                                                font-size: 13px;
                                                font-weight: 700;
                                                border: 1px solid #fbbf24;
                                            ">${longueurFormatted} m</div>
                                        </div>
                                    </div>
                                `;
                            }
                        }

                       // ✅ DEBUG COMPLET - À retirer après débogage
                            console.log(`🔍 DEBUG Projet ${idProjet}:`, {
                                'props.thematiques': props.thematiques,
                                'type': typeof props.thematiques,
                                'isArray': Array.isArray(props.thematiques),
                                'length si array': Array.isArray(props.thematiques) ? props.thematiques.length : 'N/A',
                                'props.nombre_thematiques': props.nombre_thematiques,
                                'props.thematiques_count': props.thematiques_count
                            });

                        // ✅ CALCUL CORRECT DU NOMBRE DE THÉMATIQUES
                            let nombreThematiques = 0;

                            // Option 1: Si thematiques est un tableau (format API détaillée)
                            if (typeof props.nombre_thematiques === 'number') {
                                nombreThematiques = props.nombre_thematiques;
                            }
                            else if (typeof props.thematiques_count === 'number') {
                                nombreThematiques = props.thematiques_count;
                            }
                            else if (Array.isArray(props.thematiques)) {
                                nombreThematiques = props.thematiques.length;
                            }
                            
                            

                            console.log(`🎯 Projet ${idProjet}: ${nombreThematiques} thématique(s)`);


                     // Construction du HTML du tooltip
                        const tooltipContent = `
                            <div style="
                                background: white;
                                border-radius: 8px;
                                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                                padding: 16px;
                                min-width: 280px;
                                max-width: 350px;
                                max-height: 450px;
                                overflow-y: auto;
                                font-family: 'MARIANNE', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                            "
                            class="tooltip-scrollable-content"
                            >
                                <!-- En-tête avec ID -->
                                <div style="
                                    display: flex;
                                    align-items: center;
                                    justify-content: space-between;
                                    margin-bottom: 12px;
                                    padding-bottom: 10px;
                                    border-bottom: 2px solid #e2e8f0;
                                ">
                                    <span style="
                                        font-size: 11px;
                                        font-weight: 600;
                                        color: #64748b;
                                        letter-spacing: 0.5px;
                                    ">ID PROJET</span>
                                    <span style="
                                        font-family: monospace;
                                        font-size: 13px;
                                        font-weight: 700;
                                        color: #2563eb;
                                        background: #dbeafe;
                                        padding: 4px 10px;
                                        border-radius: 6px;
                                    ">${idProjet}</span>
                                </div>

                                <!-- Nom du projet -->
                                <h3 style="
                                    margin: 0 0 8px 0;
                                    font-size: 15px;
                                    font-weight: 700;
                                    color: #1e293b;
                                    line-height: 1.4;
                                ">Nom du projet : ${nomProjet}</h3>

                                <!-- Description -->
                                <div style="margin-bottom: 12px;">
                                    <div style="font-size: 12px; color: #64748b; font-weight: 600; margin-bottom: 4px;">DESCRIPTION</div>
                                    <div style="font-size: 12px; color: ${description !== 'Aucune description' ? '#475569' : '#94a3b8'}; 
                                        line-height: 1.5; font-style: ${description !== 'Aucune description' ? 'normal' : 'italic'};">
                                        ${description !== 'Aucune description' && description.length > 150 ? description.substring(0, 150) + '...' : description}
                                    </div>
                                </div>

                                <!-- Informations détaillées -->
                                <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">
                                    <!-- Communes -->
                                    <div style="display: flex; align-items: flex-start; gap: 8px;">
                                        <span style="font-size: 16px;">📍</span>
                                        <div style="flex: 1;">
                                            <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 2px;">COMMUNE(S)</div>
                                            <div style="font-size: 13px; color: #1e293b; font-weight: 500;">${communesText}</div>
                                        </div>
                                    </div>

                                    <!-- Type de porteur -->
                                    <div style="display: flex; align-items: flex-start; gap: 8px;">
                                        <span style="font-size: 16px;">👥</span>
                                        <div style="flex: 1;">
                                            <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 2px;">TYPE DE PORTEUR</div>
                                            <div style="font-size: 13px; color: #1e293b; font-weight: 500;">${typePorteur}</div>
                                        </div>
                                    </div>

                                    <!-- Statut -->
                                    <div style="display: flex; align-items: flex-start; gap: 8px;">
                                        <span style="font-size: 16px;">📊</span>
                                        <div style="flex: 1;">
                                            <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 2px;">STATUT</div>
                                            <div style="
                                                display: inline-block;
                                                padding: 4px 10px;
                                                background: ${getStatusStyle(statut).fillColor};
                                                color: ${getStatusStyle(statut).color};
                                                border-radius: 6px;
                                                font-size: 12px;
                                                font-weight: 600;
                                                border: 1px solid ${getStatusStyle(statut).color};
                                            ">${statut}</div>
                                        </div>
                                    </div>

                                    <!-- Service DDT -->
                                    <div style="display: flex; align-items: flex-start; gap: 8px;">
                                        <span style="font-size: 16px;">🏛️</span>
                                        <div style="flex: 1;">
                                            <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 2px;">SERVICE DDT</div>
                                            <div style="font-size: 13px; color: #1e293b; font-weight: 500;">${serviceDDT}</div>
                                        </div>
                                    </div>

                                    <!-- Thématiques -->
                                    <div style="display: flex; align-items: flex-start; gap: 8px;">
                                        <span style="font-size: 16px;">🎯</span>
                                        <div style="flex: 1;">
                                            <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 2px;">THÉMATIQUES</div>
                                            <div style="
                                                display: inline-block;
                                                padding: 4px 10px;
                                                background: #f0fdf4;
                                                color: #15803d;
                                                border-radius: 6px;
                                                font-size: 13px;
                                                font-weight: 700;
                                                border: 1px solid #86efac;
                                            ">${nombreThematiques} thématique${nombreThematiques > 1 ? 's' : ''}</div>
                                        </div>
                                    </div>

                                    <!-- Dimension (superficie ou longueur) -->
                                    ${dimensionText}
                                </div>

                                <!-- Footer -->
                                <div style="
                                    margin-top: 12px;
                                    padding-top: 12px;
                                    border-top: 1px solid #e2e8f0;
                                    text-align: center;
                                    font-size: 11px;
                                    color: #94a3b8;
                                    font-style: italic;
                                ">
                                    Cliquez pour voir les détails complets
                                </div>
                            </div>
                        `;



                        // ✅ SOLUTION SIMPLE: Afficher TOUS les tooltips vers le BAS
                        // Cela garantit que tout le contenu est toujours visible
                        layer.bindTooltip(tooltipContent, {
                            permanent: false,
                            direction: 'bottom',  // ⬇️ TOUJOURS EN BAS
                            offset: [0, 20],      // Décalage de 20px vers le bas
                            className: 'custom-card-tooltip',
                            opacity: 1
                        });

                        // Effet hover visuel
                        layer.on('mouseover', function () {
                            if (geom.type !== 'Point') {
                                this.setStyle({
                                    weight: 5,
                                    fillOpacity: 0.6
                                });
                            }
                        });

                        // Événement de clic pour ouvrir la sidebar
                        layer.on('click', () => {
                            const projectId = props.id_projet || props.idprojet;
                            if (projectId) {
                                setSelectedProjectId(projectId);
                                if (onSelect) onSelect(projectId);
                            }
                        });

                        layer.on('mouseout', function () {
                            if (geom.type !== 'Point') {
                                geoJsonLayer.resetStyle(this);
                            }
                        });
                    }
                });

                geoJsonLayer.addTo(map);
                geoJsonLayerRef.current = geoJsonLayer;

                console.log(`✅ ${featureCollection.features.length} projets affichés`);
            } catch (error) {
                console.error('❌ Erreur lors du rendu des projets:', error);
            }
    }, [onSelect]);

   

    // Appliquer les filtres
    useEffect(() => {
        if (!loading && filteredProjects) {
            console.log(`🗺️ Rendu de ${filteredProjects.features.length} projets sur la carte`);
            renderProjects(filteredProjects);
        }
    }, [loading, filteredProjects, renderProjects]);

    // Gérer la sélection de localisation
    const handleLocationSelect = useCallback((item) => {
        const map = mapRef.current;
        if (!map || !item?.coordonnees) {
            console.warn('⚠️ Impossible de centrer sur la localisation');
            return;
        }

        const { lat, lng } = item.coordonnees;

        if (locationMarkerRef.current) {
            try {
                map.removeLayer(locationMarkerRef.current);
            } catch (e) {
                console.warn('Erreur suppression marqueur:', e);
            }
        }

        const marker = L.marker([lat, lng]).addTo(map);
        marker.bindPopup(`<div style="padding:8px;"><strong>${item.nom}</strong></div>`).openPopup();
        map.setView([lat, lng], 13, { animate: true });
        locationMarkerRef.current = marker;
        console.log('📍 Centré sur:', item.nom);
    }, []);

    // 👇 Bouton Vue Liste
    const viewToggleButton = (
        <button
            className={styles.viewToggleButton}
            onClick={goToListe}
            title="Passer à la vue liste"
        >
            📋 Vue Liste
        </button>
    );


    return (
        <div className="map-container">
            <MapFilters
                onFilterChange={handleFilterChange}
                onLocationSelect={handleLocationSelect}
                communes={geoEntities}
                viewToggleButton={viewToggleButton}
            />

            <div className="map-with-sidebar" style={{ height: '100%', position: 'relative' }}>
                {loading && <div className="map-loading-overlay">Chargement des projets...</div>}
                {error && <div className="map-error-overlay">{error}</div>}

                {/* ✅ CARTE PLEINE LARGEUR */}
                <div
                    ref={mapDiv}
                    className="leaflet-map"
                    style={{
                        width: '100%',
                        height: '100%',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        zIndex: 1
                    }}
                />

                {/* ✅ BOUTON CHANGEMENT DE COUCHE */}
                <button
                    className="map-layer-toggle"
                    onClick={toggleLayer}
                    title={layerKey === 'plan' ? 'Passer en vue satellite' : 'Passer en vue plan'}
                >
                    <img src={changelayout} alt="Changer de couche" />
                </button>

                {/* ✅ SIDEBAR PAR-DESSUS LA CARTE */}
                {selectedProjectId && (
                    <div className="sidebar-overlay">
                        <Sidebar
                            projectId={selectedProjectId}
                            onClose={() => setSelectedProjectId(null)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
