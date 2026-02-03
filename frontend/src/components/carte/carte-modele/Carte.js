// frontend/src/components/carte/carte-modele/Carte.js

import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from '../../../styles/CarteSection.module.css';
import { TILE_CONFIG, MAP_CENTER, MAP_BOUNDS } from '../../../config/mapConfig';

// Configuration pour Eure-et-Loir
const EURE_ET_LOIR_CENTER = MAP_CENTER;
const EURE_ET_LOIR_BOUNDS = MAP_BOUNDS;

// ✅ CORRECTION: Utiliser () au lieu de {}
const Carte = forwardRef(({
                              onGeometryChange,
                              initialGeometry = null,
                              existingGeometry = null,
                              editable = true,
                              className = "",
                              selectedTool = null,
                              onToolComplete = null,
                              center = null,
                              existingProjects = [],
                              showExistingProjects = false,
                          }, ref) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const drawnItemsRef = useRef(null);
    const tempLayerRef = useRef(null);
    const existingProjectsLayerRef = useRef(null);
    const currentTileLayerRef = useRef(null);

    const [selectedLayer, setSelectedLayer] = useState(null);
    const [mapLayer, setMapLayer] = useState('plan');
    const [isDrawing, setIsDrawing] = useState(false);

    // Définition des couches de fond IGN
    const tileLayers = {
        ortho: L.tileLayer(
            TILE_CONFIG.ortho.url,
            {
                minZoom: TILE_CONFIG.ortho.minZoom,
                maxZoom: TILE_CONFIG.ortho.maxZoom,
                attribution: TILE_CONFIG.ortho.attribution,
                tileSize: 256,
            }
        ),
        plan: L.tileLayer(
            TILE_CONFIG.plan.url,
            {
                minZoom: TILE_CONFIG.plan.minZoom,
                maxZoom: TILE_CONFIG.plan.maxZoom,
                attribution: TILE_CONFIG.plan.attribution,
                tileSize: 256,
            }
        ),
    };

    // Styles de dessin
    const drawStyles = {
        polygon: {
            color: '#e74c3c',
            fillColor: '#e74c3c',
            fillOpacity: 0.3,
            weight: 2,
        },
        polyline: {
            color: '#3498db',
            weight: 3,
        },
        tempPolygon: {
            color: '#e74c3c',
            fillColor: '#e74c3c',
            fillOpacity: 0.1,
            weight: 2,
            dashArray: '5, 5'
        },
        tempPolyline: {
            color: '#3498db',
            weight: 3,
            dashArray: '5, 5'
        },
        marker: {
            icon: L.icon({
                iconUrl: 'data:image/svg+xml;base64,' + btoa(`
          <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
            <path fill="#e74c3c" stroke="#c0392b" stroke-width="2" d="M12.5,0C5.6,0,0,5.6,0,12.5c0,12.5,12.5,28.5,12.5,28.5s12.5-16,12.5-28.5C25,5.6,19.4,0,12.5,0z"/>
            <circle fill="white" cx="12.5" cy="12.5" r="6"/>
          </svg>
        `),
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
            }),
        },
    };

    // Initialisation de la carte
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        const map = L.map(mapRef.current, {
            center: EURE_ET_LOIR_CENTER,
            zoom: 10,
            maxBounds: EURE_ET_LOIR_BOUNDS,
            maxBoundsViscosity: 1.0,
            zoomControl: true,
        });

        // Ajouter la couche de base par défaut
        const initialLayer = tileLayers[mapLayer];
        initialLayer.addTo(map);
        currentTileLayerRef.current = initialLayer;

        // Créer le groupe pour les dessins
        const drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);
        drawnItemsRef.current = drawnItems;

        if (drawnItems._container) {
            drawnItems._container.style.zIndex = 1000;
        }

        mapInstanceRef.current = map;

        setTimeout(() => {
            if (mapInstanceRef.current){
                mapInstanceRef.current.invalidateSize()
            }
        }, 100)

        // Charger la géométrie initiale si elle existe
        if (initialGeometry) {
            loadInitialGeometry(initialGeometry);
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // ✅ NOUVEAU: Charger existingGeometry quand elle change (édition)
    useEffect(() => {
        if (!existingGeometry?.geom) return;
        console.log('🗺️ Carte - Chargement de existingGeometry:', existingGeometry);
        loadInitialGeometry(existingGeometry);
    }, [existingGeometry?.geom]);

    // Changer la couche de fond
    const changeMapLayer = (layerName) => {
        if (!mapInstanceRef.current) return;

        // Supprimer la couche actuelle en utilisant la référence
        if (currentTileLayerRef.current) {
            try {
                mapInstanceRef.current.removeLayer(currentTileLayerRef.current);
            } catch (e) {
                console.warn('Erreur lors de la suppression de la couche:', e);
            }
        }

        // Ajouter la nouvelle couche
        const newLayer = tileLayers[layerName];
        newLayer.addTo(mapInstanceRef.current);
        currentTileLayerRef.current = newLayer;
        setMapLayer(layerName);
        console.log(`🎨 Couche changée: ${layerName}`);
    };

    // Charger une géométrie existante sur la carte
    const loadInitialGeometry = useCallback((geometry) => {
        if (!mapInstanceRef.current || !drawnItemsRef.current || !geometry.geom) return;

        try {
            // Effacer les couches existantes
            drawnItemsRef.current.clearLayers();

            // Parser geom si c'est une chaîne JSON
            let geomData = geometry.geom;
            if (typeof geomData === 'string') {
                try {
                geomData = JSON.parse(geomData);
                } catch (e) {
                console.error('❌ Erreur parsing geom:', e);
                return;
                }
            }

            const layer = L.geoJSON(geometry.geom, {
                style: () => {
                    switch (geometry.geom_type) {
                        case 'Polygon':
                        case 'MultiPolygon':
                            return drawStyles.polygon;
                        case 'LineString':
                        case 'MultiLineString':
                            return drawStyles.polyline;
                        default:
                            return {};
                    }
                },
                pointToLayer: (feature, latlng) => {
                    // ✅ Utiliser CircleMarker pour correspondre au style de dessin
                    return L.circleMarker(latlng, {
                        radius: 8,
                        fillColor: '#e74c3c',
                        color: '#fff',
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.8
                    });
                }
            });

            drawnItemsRef.current.addLayer(layer);

            // ✅ Gérer différemment les Points et les autres géométries
            if (geometry.geom_type === 'Point') {
                // Pour un Point, utiliser setView au lieu de fitBounds
                const coords = geometry.geom.coordinates;
                if (coords && coords.length === 2) {
                    // GeoJSON utilise [lng, lat], Leaflet utilise [lat, lng]
                    mapInstanceRef.current.setView([coords[1], coords[0]], 15);
                    console.log('✅ Point centré sur:', [coords[1], coords[0]]);
                }
            } else {
                // Pour les polygones et lignes, utiliser fitBounds
                try {
                    mapInstanceRef.current.fitBounds(layer.getBounds(), { padding: [20, 20] });
                } catch (error) {
                    console.error('❌ Erreur fitBounds:', error);
                }
            }

            setSelectedLayer(layer);
        } catch (error) {
            console.error('Erreur lors du chargement de la géométrie:', error);
        }
    }, []);

    // Notifier le parent du changement de géométrie
    const notifyGeometryChange = (layer) => {
        if (!layer) {
            onGeometryChange && onGeometryChange(null);
            return;
        }

        try {
            const geoJSON = layer.toGeoJSON();
            const geometryData = {
                geom: geoJSON.geometry,
                geom_type: geoJSON.geometry.type,
            };

            onGeometryChange && onGeometryChange(geometryData);
        } catch (error) {
            console.error('Erreur lors de la conversion géométrie:', error);
            onGeometryChange && onGeometryChange(null);
        }
    };

    // Nettoyer la couche temporaire
    const clearTempLayer = () => {
        if (tempLayerRef.current && mapInstanceRef.current) {
            mapInstanceRef.current.removeLayer(tempLayerRef.current);
            tempLayerRef.current = null;
        }
    };

    // Dessin de point
    const startPointDrawing = (map) => {
        map.getContainer().style.cursor = 'crosshair';
        setIsDrawing(true);
        console.log('🎯 Mode dessin de point activé');

        const onMapClick = (e) => {
            console.log('🖱️ Clic détecté à:', e.latlng);

            // Créer le CircleMarker
            const marker = L.circleMarker(e.latlng, {
            radius: 8,
            fillColor: '#e74c3c',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
            });

            console.log('✅ CircleMarker créé:', marker);

            // Vérifier que drawnItemsRef existe
            if (!drawnItemsRef.current) {
            console.error('❌ drawnItemsRef.current est null !');
            return;
            }

            // Nettoyer et ajouter
            drawnItemsRef.current.clearLayers();
            drawnItemsRef.current.addLayer(marker);
            console.log('✅ Marker ajouté à drawnItems');

            setSelectedLayer(marker);
            notifyGeometryChange(marker);
            finishDrawing();
        };

        map.on('click', onMapClick);

        return {
            type: 'point',
            cleanup: () => {
            map.off('click', onMapClick);
            map.getContainer().style.cursor = '';
            setIsDrawing(false);
            console.log('🧹 Nettoyage du mode point');
            }
        };
    };


    // Dessin de ligne avec tracé en temps réel
    const startLineDrawing = (map) => {
        map.getContainer().style.cursor = 'crosshair';
        setIsDrawing(true);

        let coordinates = [];
        let tempLine = null;

        const onMapClick = (e) => {
            coordinates.push([e.latlng.lat, e.latlng.lng]);

            if (coordinates.length === 1) {
                tempLine = L.polyline([e.latlng], drawStyles.tempPolyline);
                map.addLayer(tempLine);
                tempLayerRef.current = tempLine;
            } else {
                tempLine.addLatLng(e.latlng);
            }
        };

        const onMouseMove = (e) => {
            if (coordinates.length > 0 && tempLine) {
                const previewCoords = [...coordinates.map(coord => [coord[0], coord[1]]), [e.latlng.lat, e.latlng.lng]];
                tempLine.setLatLngs(previewCoords);
            }
        };

        const onMapDoubleClick = (e) => {
            L.DomEvent.stopPropagation(e);

            if (coordinates.length >= 2) {
                const finalLine = L.polyline(coordinates.map(coord => [coord[0], coord[1]]), drawStyles.polyline);
                clearTempLayer();
                drawnItemsRef.current.clearLayers();
                drawnItemsRef.current.addLayer(finalLine);
                setSelectedLayer(finalLine);
                notifyGeometryChange(finalLine);
            }
            finishDrawing();
        };

        map.on('click', onMapClick);
        map.on('mousemove', onMouseMove);
        map.on('dblclick', onMapDoubleClick);

        return {
            type: 'line',
            cleanup: () => {
                map.off('click', onMapClick);
                map.off('mousemove', onMouseMove);
                map.off('dblclick', onMapDoubleClick);
                map.getContainer().style.cursor = '';
                clearTempLayer();
                coordinates = [];
                setIsDrawing(false);
            }
        };
    };

    // Dessin de polygone avec tracé en temps réel
    const startPolygonDrawing = (map) => {
        map.getContainer().style.cursor = 'crosshair';
        setIsDrawing(true);

        let coordinates = [];
        let tempPolygon = null;

        const onMapClick = (e) => {
            coordinates.push([e.latlng.lat, e.latlng.lng]);

            if (coordinates.length === 1) {
                tempPolygon = L.polygon([e.latlng], drawStyles.tempPolygon);
                map.addLayer(tempPolygon);
                tempLayerRef.current = tempPolygon;
            } else {
                tempPolygon.setLatLngs([coordinates.map(coord => [coord[0], coord[1]])]);
            }
        };

        const onMouseMove = (e) => {
            if (coordinates.length > 0 && tempPolygon) {
                const previewCoords = [...coordinates.map(coord => [coord[0], coord[1]]), [e.latlng.lat, e.latlng.lng]];
                tempPolygon.setLatLngs([previewCoords]);
            }
        };

        const onMapDoubleClick = (e) => {
            L.DomEvent.stopPropagation(e);

            if (coordinates.length >= 3) {
                const finalPolygon = L.polygon(coordinates.map(coord => [coord[0], coord[1]]), drawStyles.polygon);
                clearTempLayer();
                drawnItemsRef.current.clearLayers();
                drawnItemsRef.current.addLayer(finalPolygon);
                setSelectedLayer(finalPolygon);
                notifyGeometryChange(finalPolygon);
            }
            finishDrawing();
        };

        map.on('click', onMapClick);
        map.on('mousemove', onMouseMove);
        map.on('dblclick', onMapDoubleClick);

        return {
            type: 'polygon',
            cleanup: () => {
                map.off('click', onMapClick);
                map.off('mousemove', onMouseMove);
                map.off('dblclick', onMapDoubleClick);
                map.getContainer().style.cursor = '';
                clearTempLayer();
                coordinates = [];
                setIsDrawing(false);
            }
        };
    };

    // Référence pour stocker l'outil actuel
    const currentToolRef = useRef(null);

    // Démarrer un outil de dessin
    const startDrawing = (tool) => {
        if (!mapInstanceRef.current || !editable) return;

        stopCurrentTool();

        const map = mapInstanceRef.current;
        let toolHandler = null;

        switch (tool) {
            case 'point':
                toolHandler = startPointDrawing(map);
                break;
            case 'line':
                toolHandler = startLineDrawing(map);
                break;
            case 'polygon':
                toolHandler = startPolygonDrawing(map);
                break;
            default:
                return;
        }

        currentToolRef.current = toolHandler;
    };

    // Arrêter l'outil de dessin actuel
    const stopCurrentTool = () => {
        if (currentToolRef.current && currentToolRef.current.cleanup) {
            currentToolRef.current.cleanup();
            currentToolRef.current = null;
        }
    };

    // Finir le dessin et notifier le parent
    const finishDrawing = () => {
        stopCurrentTool();
        if (onToolComplete) {
            onToolComplete();
        }
    };

    // Effacer tous les dessins
    const clearDrawings = () => {
        if (drawnItemsRef.current) {
            drawnItemsRef.current.clearLayers();
            setSelectedLayer(null);
            notifyGeometryChange(null);
        }
        clearTempLayer();
        stopCurrentTool();
    };

    // Effet pour gérer les changements d'outil depuis le parent
    useEffect(() => {
        if (selectedTool && editable) {
            startDrawing(selectedTool);
        } else {
            stopCurrentTool();
        }
    }, [selectedTool, editable]);

    // Gestionnaires d'événements
    useEffect(() => {
        if (!mapInstanceRef.current) return;

        const map = mapInstanceRef.current;

        const onContextMenu = () => {
            stopCurrentTool();
            if (onToolComplete) {
                onToolComplete();
            }
        };

        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                stopCurrentTool();
                if (onToolComplete) {
                    onToolComplete();
                }
            }
        };

        map.on('contextmenu', onContextMenu);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            map.off('contextmenu', onContextMenu);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [onToolComplete]);

    useEffect(() => {
        if (!mapRef.current || !mapInstanceRef.current) return

        const resizeObserver = new ResizeObserver(() => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.invalidateSize()
            }
        })

        resizeObserver.observe(mapRef.current)

        return () => {
            resizeObserver.disconnect()
        }
    }, [])

    useEffect(() => {
        if (!mapInstanceRef.current) return

        const handleVisibilityChange = () => {
            if (!document.hidden && mapInstanceRef.current) {
                setTimeout(() => {
                    mapInstanceRef.current.invalidateSize()
                }, 100)
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [])

    useEffect(() => {
        if (!mapInstanceRef.current) return

        const handleResize = () => {
            if (mapInstanceRef.current) {
                setTimeout(() => {
                    mapInstanceRef.current.invalidateSize()
                }, 100)
            }
        }

        window.addEventListener('resize', handleResize)
        setTimeout(handleResize, 200)

        return () => {
            window.removeEventListener('resize', handleResize)
        }
    }, [])

    // Afficher les projets existants sur la carte
    useEffect(() => {
        if (!mapInstanceRef.current) return;

        // Supprimer la couche existante si elle existe
        if (existingProjectsLayerRef.current) {
            mapInstanceRef.current.removeLayer(existingProjectsLayerRef.current);
            existingProjectsLayerRef.current = null;
        }

        // Ajouter les projets existants si l'option est activée
        if (showExistingProjects && existingProjects.length > 0) {
            console.log('📍 Affichage de', existingProjects.length, 'projets existants');

            const projectsLayer = L.geoJSON(existingProjects, {
                style: (feature) => ({
                    color: '#047857',
                    fillColor: '#10B981',
                    fillOpacity: 0.45,
                    weight: 3,
                    opacity: 1,
                }),
                pointToLayer: (feature, latlng) => {
                    return L.circleMarker(latlng, {
                        radius: 9,
                        fillColor: '#10B981',
                        color: '#047857',
                        weight: 3,
                        opacity: 1,
                        fillOpacity: 0.75
                    });
                },
                onEachFeature: (feature, layer) => {
                    if (feature.properties) {
                        const props = feature.properties;
                        const popupContent = `
                            <div style="min-width: 200px;">
                                <h4 style="margin: 0 0 8px 0; color: #059669;">
                                    ${props.nom_projet || 'Projet sans nom'}
                                </h4>
                                <p style="margin: 4px 0; font-size: 13px;">
                                    <strong>ID:</strong> ${props.id_projet || 'N/A'}
                                </p>
                                ${props.libelle_statut ? `
                                    <p style="margin: 4px 0; font-size: 13px;">
                                        <strong>Statut:</strong> ${props.libelle_statut}
                                    </p>
                                ` : ''}
                                ${props.communes_traversees ? `
                                    <p style="margin: 4px 0; font-size: 13px;">
                                        <strong>Communes:</strong> ${props.communes_traversees}
                                    </p>
                                ` : ''}
                            </div>
                        `;
                        layer.bindPopup(popupContent);
                    }
                }
            });

            projectsLayer.addTo(mapInstanceRef.current);
            existingProjectsLayerRef.current = projectsLayer;
        }
    }, [existingProjects, showExistingProjects]);

    // ✅ Méthode pour centrer la carte sur des coordonnées
    const panTo = useCallback((latlng, zoom = 13) => {
        if (mapInstanceRef.current) {
            console.log('🗺️ Centrage de la carte sur:', latlng, 'avec zoom:', zoom);
            mapInstanceRef.current.setView(latlng, zoom, {
                animate: true,
                duration: 1.5,
                easeLinearity: 0.5
            });
        } else {
            console.error('❌ Instance de carte non disponible');
        }
    }, []);

    // ✅ Exposer les méthodes via ref (UN SEUL useImperativeHandle)
    useImperativeHandle(ref, () => ({
        clearDrawings: clearDrawings,
        changeMapLayer: changeMapLayer,
        panTo: panTo,
        invalidateSize: () => {
            if (mapInstanceRef.current){
                mapInstanceRef.current.invalidateSize()
            }
        }
    }))

    return (
        <div className={`${styles.carteContainer} ${className}`}>
            <div className={styles.layerSelector}>
                <label>Fond de carte:</label>
                <select
                    value={mapLayer}
                    onChange={(e) => changeMapLayer(e.target.value)}
                    className={styles.select}
                >
                    <option value="plan">Plan IGN</option>
                    <option value="ortho">Orthophoto IGN</option>
                </select>
            </div>

            <div ref={mapRef} className={styles.map} />

            <div style={{ display: 'none' }}>
                <button ref={(btn) => {
                    if (btn) {
                        btn.clearDrawings = clearDrawings;
                    }
                }} />
            </div>
        </div>
    );
});

export default Carte;