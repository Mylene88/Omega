// frontend/src/pages/map/MapPage.js

import React, { useState, useEffect, useRef, useCallback} from 'react';
import {debounce} from 'lodash'
import Carte from '../../components/carte/carte-modele/Carte';
import styles from '../../styles/CarteSection.module.css';
import Search from '../../components/common/Search/Search';
import { getCurrentUserId, getApiHeaders } from '../../utils/userHelper';


const MapPage = ({
                     projetData,
                     projectId,
                     geometryData,  // ✅ AJOUT : Recevoir geometryData
                     onGeometryUpdate,
                     existingGeometry = null,
                     className = ""
                 }) => {
    const [geoEntities, setGeoEntities] = useState([])
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [currentGeometry, setCurrentGeometry] = useState(existingGeometry);
    const [spatialAnalysis, setSpatialAnalysis] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState(null);
    const [selectedTool, setSelectedTool] = useState(null);
    const [isUpdate, setIsUpdate] = useState(false);
    const carteRef = useRef(null);

    // ✅ AJOUT : useEffect pour charger la géométrie existante
    useEffect(() => {
        console.log('🗺️ MapPage - geometryData reçu:', geometryData);

         if (geometryData ) {

            setCurrentGeometry(geometryData);

            // Définir l'analyse spatiale avec les données existantes
            setSpatialAnalysis({
                superficie_ou_longueur: geometryData.length_m
                    ? `${(geometryData.length_m / 1000).toFixed(2)} km`
                    : (geometryData.area_m2
                        ? (geometryData.area_m2 >= 10000
                            ? `${(geometryData.area_m2 / 10000).toFixed(2)} ha`
                            : `${Math.round(geometryData.area_m2)} m²`)
                        : ''),
                communes_traversees: Array.isArray(geometryData.communes_traversees) 
                    ? geometryData.communes_traversees 
                    : [],
                codes_insee: geometryData.codes_insee || [],
                epci: geometryData.epci || [],
                arrondissements: geometryData.arrondissements || [],
                deputes: geometryData.deputes || [],
                maires: geometryData.maires || []
            });
        } else {
            console.log('⚠️ Aucune géométrie à charger');
        }
    }, [geometryData]);

    // Charger les données géographiques au montage du composant
    useEffect(() => {
        const fetchGeoEntities = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/geo-entities');
                if (response.ok) {
                    const data = await response.json();
                    setGeoEntities(data);
                } else {
                    console.error('Erreur lors du chargement des entités géographiques');
                }
            } catch (error) {
                console.error('Erreur fetch geo-entities:', error);
            }
        };

        fetchGeoEntities();
    }, []);

    const handleSearchSelect = (item) => {
        console.log('🔍 Commune sélectionnée:', item);

        if (item.coordonnees) {
            const { lat, lng } = item.coordonnees;
            console.log('📍 Centrage sur:', lat, lng);

            // Utiliser la référence de la carte pour centrer et zoomer
            if (carteRef.current && carteRef.current.panTo) {
                carteRef.current.panTo([lat, lng], 13);
            } else {
                console.error('❌ Référence carte non disponible');
            }
        }
    };

    // Fonction pour analyser la géométrie via l'API
    const analyzeGeometry = async (geometryData) => {
        if (!geometryData) {
            console.log('⚠️ Analyse spatiale impossible - géométrie manquante');
            setSpatialAnalysis(null);
            return;
        }

        console.log('🚀 DÉBUT ANALYSE SPATIALE');
        console.log('📋 Données entrantes:', {
            geometryData,
            projectId: projetData?.id_projet,
            hasIdGeom: !!projetData?.id_geom
        });

        setIsAnalyzing(true);
        setAnalysisError(null);

        try {
            const isNewProject = !projetData?.id_geom;

            // 🔐 Récupérer l'userId pour le système de versioning
            const userId = getCurrentUserId();
            if (!userId) {
                console.warn('⚠️ Aucun userId trouvé - versioning désactivé pour cette requête');
            }

            let endpoint, method, requestData;

            if (isNewProject) {
                console.log('🆕 Nouveau projet - analyse temporaire');
                endpoint = 'http://localhost:3000/api/geometry-temp';
                method = 'POST';
                requestData = {
                    project_id: projetData?.id_projet || 'temp_' + Date.now(),
                    geom: geometryData.geom,
                    geom_type: geometryData.geom_type,
                };
                if (userId) requestData.userId = userId;
            } else {
                console.log('🔄 Projet existant - mise à jour');
                endpoint = `http://localhost:3000/api/projet-geometry/${projetData.id_geom}`;
                method = 'PATCH';
                requestData = {
                    geom: geometryData.geom,
                    geom_type: geometryData.geom_type,
                };
                if (userId) requestData.userId = userId;
            }

            if (userId) {
                console.log(`🔐 userId ajouté: ${userId}`);
            }

            console.log('📤 Requête API:', { endpoint, method, requestData });

            const response = await fetch(endpoint, {
                method: method,
                headers: getApiHeaders({ 'Accept': 'application/json' }),
                body: JSON.stringify(requestData),
            });

            console.log('📥 Réponse reçue:', {
                status: response.status,
                statusText: response.statusText,
                contentType: response.headers.get('content-type')
            });

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const textResponse = await response.text();
                console.error('❌ Réponse HTML reçue au lieu de JSON:', textResponse.substring(0, 500));
                throw new Error(`Le serveur a retourné du HTML. Endpoint: ${endpoint}`);
            }

            const result = await response.json();
            console.log('✅ Résultat JSON:', result);

            if (!response.ok) {
                throw new Error(result.error || result.message || `Erreur ${response.status}`);
            }

            if (result.success) {
                setSpatialAnalysis(result.data);
                setIsUpdate(!isNewProject);

                if (onGeometryUpdate) {
                    onGeometryUpdate({
                        ...geometryData,
                        ...result.data,
                        isUpdate: !isNewProject
                    });
                }
            } else {
                throw new Error(result.message || result.error || 'Erreur analyse');
            }

        } catch (error) {
            console.error('💥 ERREUR ANALYSE:', error);
            console.error('Stack:', error.stack);
            setAnalysisError(error.message);

            if (onGeometryUpdate) {
                onGeometryUpdate(geometryData);
            }
        } finally {
            setIsAnalyzing(false);
        }
    };

    const debouncedAnalyze = useCallback(
        debounce((geometryData) => {
            analyzeGeometry(geometryData);
        }, 500),
        [projetData]
    );

    // Gestionnaire des changements de géométrie
    const handleGeometryChange = (geometryData) => {
        console.log('📍 Géométrie changée - DEBUT');
        console.log('📍 geometryData:', geometryData);
        console.log('📍 projetData:', projetData);
        console.log('📍 Project ID direct:', projectId);

        setCurrentGeometry(geometryData);

        if (geometryData) {
            const currentProjectId = projetData?.id_projet || projectId;

            if (currentProjectId) {
                console.log('📍 Lancement analyse spatiale pour projet:', currentProjectId);
                debouncedAnalyze(geometryData);
            } else {
                console.log('⚠️ Aucun ID projet disponible');
                setSpatialAnalysis(null);
                if (onGeometryUpdate) {
                    onGeometryUpdate(geometryData);
                }
            }
        } else {
            console.log('🗑️ Géométrie effacée');
            setSpatialAnalysis(null);
            if (onGeometryUpdate) {
                onGeometryUpdate(null);
            }
        }
        console.log('📍 Géométrie changée - FIN');
    };

    // Gestionnaires des outils de dessin
    const handleToolSelect = (tool) => {
        if (selectedTool === tool) {
            setSelectedTool(null);
        } else {
            setSelectedTool(tool);
        }
    };

    const handleToolComplete = () => {
        setSelectedTool(null);
    };

    const handleClearDrawings = () => {
        if (carteRef.current && carteRef.current.clearDrawings) {
            carteRef.current.clearDrawings();
        }
        setSelectedTool(null);
    };

    useEffect(() => {
        if (projetData?.id_projet && currentGeometry && !spatialAnalysis) {
            analyzeGeometry(currentGeometry);
        }
    }, [projetData?.id_projet]);

    return (
        <div className={`${styles.mapFormSection} ${className}`}>
            <div className={styles.mapHeader}>
                <h3>Carte du projet</h3>
                <p className={styles.mapDescription}>
                    Dessinez une zone pour définir l'emprise géographique de votre projet
                </p>
            </div>

            {/* Search box au-dessus des contrôles */}
            <div className={styles.searchContainer}>
                <Search data={geoEntities} onSelect={handleSearchSelect}/>
            </div>

            <div className={styles.controles}>
                <div className={styles.drawTools}>
                    <button
                        onClick={() => handleToolSelect('point')}
                        className={`${styles.toolBtn} ${selectedTool === 'point' ? styles.active : ''}`}
                        title="Dessiner un point"
                    >
                        📍 Point
                    </button>
                    <button
                        onClick={() => handleToolSelect('line')}
                        className={`${styles.toolBtn} ${selectedTool === 'line' ? styles.active : ''}`}
                        title="Dessiner une ligne"
                    >
                        📏 Ligne
                    </button>
                    <button
                        onClick={() => handleToolSelect('polygon')}
                        className={`${styles.toolBtn} ${selectedTool === 'polygon' ? styles.active : ''}`}
                        title="Dessiner un polygone"
                    >
                        ⬜ Polygone
                    </button>
                    <button
                        onClick={handleClearDrawings}
                        className={styles.clearBtn}
                        title="Effacer tous les dessins"
                    >
                        🗑️ Effacer
                    </button>
                </div>
            </div>

            {/* Composant carte */}
            <div className={styles.mapWrapper}>
                <Carte
                    ref={carteRef}
                    onGeometryChange={handleGeometryChange}
                    initialGeometry={currentGeometry}
                    editable={true}
                    existingGeometry={currentGeometry} 
                    className={styles.formCarte}
                    selectedTool={selectedTool}
                    onToolComplete={handleToolComplete}
                    center={selectedLocation}
                />

                {/* Indicateur de chargement */}
                {isAnalyzing && (
                    <div className={styles.analysisLoading}>
                        <div className={styles.spinner}></div>
                        <span>Analyse spatiale en cours...</span>
                    </div>
                )}

                {/* Erreur d'analyse */}
                {analysisError && (
                    <div className={styles.analysisError}>
                        <strong>Erreur d'analyse:</strong> {analysisError}
                    </div>
                )}
            </div>

            {/* Section des champs de données sous la carte */}
            <div className={styles.spatialDataFields}>
                <div className={styles.fieldGroup}>
                    <label>Superficie ou longueur</label>
                    <input
                        type="text"
                        value={spatialAnalysis?.superficie_ou_longueur || ''}
                        readOnly
                        style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                        placeholder="Dessinez une zone pour calculer"
                    />
                </div>

                <div className={styles.fieldGroup}>
                    <label>Commune(s)</label>
                    <textarea
                        value={spatialAnalysis?.communes_traversees?.join(', ') || ''} 
                        readOnly
                        style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                        placeholder="Communes concernées par le projet"
                        rows={2}
                    />
                </div>

                <div className={styles.fieldGroup}>
                    <label>Code Insee</label>
                    <textarea
                        value={Array.isArray(spatialAnalysis?.codes_insee)
                            ? spatialAnalysis.codes_insee.join(', ')
                            : ''}
                        readOnly
                        style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                        placeholder="Codes INSEE des communes"
                        rows={2}
                    />
                </div>

                <div className={styles.fieldGroup}>
                    <label>EPCI</label>
                    <textarea
                        value={Array.isArray(spatialAnalysis?.epci)
                            ? spatialAnalysis.epci.join(', ')
                            : ''}
                        readOnly
                        style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                        placeholder="Établissements publics de coopération intercommunale"
                        rows={2}
                    />
                </div>

                <div className={styles.fieldGroup}>
                    <label>Arrondissement(s)</label>
                    <textarea
                        value={Array.isArray(spatialAnalysis?.arrondissements)
                            ? spatialAnalysis.arrondissements.join(', ')
                            : ''}
                        readOnly
                        style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                        placeholder="Arrondissements concernés"
                        rows={2}
                    />
                </div>

                <div className={styles.fieldGroup}>
                    <label>Député(s)</label>
                    <textarea
                        value={Array.isArray(spatialAnalysis?.deputes)
                            ? spatialAnalysis.deputes.join(', ')
                            : ''}
                        readOnly
                        style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                        placeholder="Députés des circonscriptions concernées"
                        rows={2}
                    />
                </div>

                <div className={styles.fieldGroup}>
                    <label>Maire(s)</label>
                    <textarea
                        value={Array.isArray(spatialAnalysis?.maires)
                            ? spatialAnalysis.maires.join(', ')
                            : ''}
                        readOnly
                        style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                        placeholder="Maires des communes concernées"
                        rows={3}
                    />
                </div>
            </div>
        </div>
    );
};

export default MapPage;