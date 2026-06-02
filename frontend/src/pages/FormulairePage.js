//frontend/src/pages/FormulairePage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from "react-router-dom";
import InfosProjetSection from '../components/projet/InfosProjet/IP';
import PorteurContact from './Porteur-Contact/PorteurContact';
import SuiviDdtSection from '../components/suivi_ddt/Suivi_ddt/SuiviDdt';
import Document from './Document/DocumentPage';
import ThematiqueModele from './Thematique/ThematiquePage';
import MapPage from './Map/MapPage';
import Id from './Id/Id';
import '../styles/globals.css';
import Search from "../components/common/Search/Search";
import { getCurrentUserId, getApiHeaders } from '../utils/userHelper';
import { API_BASE_URL } from '../config/apiConfig';

const SECTION_LABELS = {
    projet_info: 'Informations générales',
    porteurs: 'Porteurs',
    suivis: 'Suivi DDT',
    thematiques: 'Thématiques',
    documents: 'Documents',
    geometrie: 'Géométrie'
};

export default function FormulairePage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [thematiqueData, setThematiqueData] = useState([]);
    const [documentsData, setDocumentsData] = useState([]);
    const [porteursData, setPorteursData] = useState([]);
    const [projetData, setProjetData] = useState({
        id_projet: null,
        nom_projet: '',
        description: '',
        statut_projet_id: null,
    });
    const [geometryData, setGeometryData] = useState(null);
    const [statutData, setStatutData] = useState({});
    const [serviceDdtData, setServiceDdtData] = useState({});

    const [isGeneratingId, setIsGeneratingId] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);
    const [sectionMeta, setSectionMeta] = useState({});
    const [dirtySections, setDirtySections] = useState({});
    const [savingSections, setSavingSections] = useState({});
    const [staleSections, setStaleSections] = useState({});

    const [suiviData, setSuiviData] = useState({
        historique: [],
        suiviDescription: '',
        enjeuPrioritaire: false,
        charteAccueil: false,
        service_id: null,
        contactDDT: ''
    });

    // À l'intérieur du composant FormulairePage
    const generateProjectId = async () => {
        setIsGeneratingId(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/projets/generate-id`);
            const result = await res.json();
            if (result?.success && result?.data?.idprojet) {
                setProjetData(prev => ({ ...prev, id_projet: result.data.idprojet }));
                return;
            }
            throw new Error('Réponse invalide');
        } catch (e) {
            console.error('Erreur génération ID:', e);
            const tempId = `ID-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
            setProjetData(prev => ({ ...prev, id_projet: tempId }));
        }
        // pas de setIsGeneratingId(false) ici: l'effet se charge de le faire
    };


    useEffect(() => {
        if (!id) generateProjectId(); // création
    }, [id]);

    useEffect(() => {
        setIsGeneratingId(!projetData?.id_projet);
    }, [projetData?.id_projet]);



    useEffect(() => {
        if (id) {
            fetch(`${API_BASE_URL}/api/projets/${id}`)
                .then(res => res.json())
                .then(data => {
                    const projetComplet = data.data;

                    console.log('📦 Données complètes reçues du backend:', projetComplet);

                    // ✅ Informations de base du projet
                    setProjetData({
                        id_projet: projetComplet.projet.id,
                        nom_projet: projetComplet.projet.nom,
                        description: projetComplet.projet.description,
                        statut_projet_id: projetComplet.statut?.id,
                        date_ident_projet: projetComplet.projet.dateIdentification,
                        projet_signale: projetComplet.projet.projetSignale,
                        charte_accueil: projetComplet.projet.charteAccueil,
                        referent_ddt: projetComplet.projet.referentDdt,
                        service_ddt_id: projetComplet.serviceDdt?.id,
                    });

                    // ✅ Transformation des PORTEURS (backend → frontend)
                    console.log('👥 Porteurs reçus:', projetComplet.porteurs);
                    const porteursFormates = (projetComplet.porteurs || []).map(p => ({
                        id_porteur: p.id,
                        type_porteur_id: p.typePorteur?.id || null,
                        type_porteur_libelle: p.typePorteur?.libelle || null,
                        autre_type_porteur: p.autreTypePorteur || null,
                        nom_structure: p.nomStructure || '',
                        referent_nom: p.referent?.nom || null,
                        referent_fonction: p.referent?.fonction || null,
                        referent_email: p.referent?.email || null,
                        referent_tel: p.referent?.telephone || null
                    }));
                    setPorteursData(porteursFormates);

                    // ✅ Transformation des THÉMATIQUES (backend → frontend)
                    console.log('🏷️ Thématiques reçues:', projetComplet.thematiques);

                    const thematiquesFormatees = (projetComplet.thematiques || []).flatMap(t => {
                        // Le backend envoie modele comme un tableau JSON : "[\"eolien\", \"methanisation\"]"
                        let modeles = [];
                        try {
                            modeles = typeof t.modele === 'string' ? JSON.parse(t.modele) : t.modele;
                        } catch (e) {
                            console.error('❌ Erreur parsing modele:', t.modele, e);
                            modeles = [];
                        }

                        // Si modeles est vide ou n'est pas un tableau, retourner un tableau vide
                        if (!Array.isArray(modeles) || modeles.length === 0) {
                            return [];
                        }

                        // ✅ Filtrer et créer une thématique frontend UNIQUEMENT pour les modèles qui ont des données
                        return modeles
                            .filter(modeleValue => {
                                // Vérifier si ce modèle a des données saisies
                                const hasDonnees = t.donnees?.[modeleValue] &&
                                                   Array.isArray(t.donnees[modeleValue]) &&
                                                   t.donnees[modeleValue].length > 0;

                                if (!hasDonnees) {
                                    console.log(`⏩ Ignorer ${modeleValue} (pas de données)`);
                                }

                                return hasDonnees;
                            })
                            .map(modeleValue => {
                                // ✅ Normaliser le libellé pour correspondre aux modelOptions
                                // "Enr" → "EnR", "Urbanisme" → "Urbanisme", etc.
                                const libelleNormalized = t.libelle === 'Enr' || t.libelle === 'enr' || t.libelle === 'ENR'
                                    ? 'EnR'
                                    : t.libelle;

                                const modeleKey = `${libelleNormalized}-${modeleValue}`;

                                // Extraire les fields depuis donnees[modeleValue]
                                const donneesModele = t.donnees[modeleValue][0];
                                console.log(`🔍 Données brutes pour ${modeleKey}:`, donneesModele);

                                const fields = {};

                                // Copier tous les champs sauf les métadonnées
                                Object.keys(donneesModele).forEach(key => {
                                    if (!['id', 'dateCreation', 'dateMiseAJour'].includes(key)) {
                                        let value = donneesModele[key];

                                        // ✅ Si c'est un tableau d'objets { id, value }, extraire les IDs pour le formulaire
                                        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] !== null && 'id' in value[0]) {
                                            value = value.map(item => item.id);
                                        }
                                        // ✅ Si c'est un objet simple { id, value }, extraire l'ID
                                        else if (typeof value === 'object' && value !== null && 'id' in value && 'value' in value) {
                                            value = value.id;
                                        }

                                        fields[key] = value;
                                        console.log(`  ✅ ${key}:`, value, `(type: ${typeof value})`);
                                    }
                                });

                                console.log(`📝 Fields finaux pour ${modeleKey}:`, fields);
                                console.log(`📝 Commentaires:`, donneesModele.commentaires);

                                return {
                                    id_thematique: t.id,
                                    libelle: t.libelle,
                                    modele: modeleKey,  // "EnR-eolien", "EnR-methanisation", etc.
                                    fields: fields,  // Contient maintenant les commentaires
                                    dateAjout: t.dateAjout,
                                    ajoutePar: t.ajoutePar
                                };
                            });
                    });

                    console.log('✅ Thématiques formatées pour le frontend:', thematiquesFormatees);
                    setThematiqueData(thematiquesFormatees);

                    // ✅ Transformation des DOCUMENTS (backend → frontend)
                    console.log('📄 Documents reçus:', projetComplet.documents);
                    const documentsFormats = (projetComplet.documents || []).map(d => ({
                        id_document: d.id,
                        lien_local: d.lienLocal || null,
                        lien_web: d.lienWeb || null
                    }));
                    setDocumentsData(documentsFormats);

                    // ✅ Transformation de la GÉOMÉTRIE (backend → frontend)
                    console.log('🗺️ Géométries reçues BRUTES:', projetComplet.geometries);
                    console.log('🗺️ Géométries type:', typeof projetComplet.geometries, 'Longueur:', projetComplet.geometries?.length);

                    if (projetComplet.geometries && projetComplet.geometries.length > 0) {
                        const geom = projetComplet.geometries[0];
                        console.log('🗺️ Première géométrie reçue:', geom);

                        setGeometryData({
                            id_geom: geom.id,
                            geom_type: geom.type,
                            geom: geom.geom,  // ✅ AJOUT : Les coordonnées GeoJSON
                            area_m2: geom.surface,
                            length_m: geom.longueur,
                            communes_traversees: geom.communes_traversees || [],
                            codes_insee: geom.codes_insee || [],
                            epci: geom.epci || [],
                            arrondissements: geom.arrondissements || [],
                            deputes: geom.deputes || [],
                            maires: geom.maires || []
                        });

                        console.log('✅ GeometryData défini avec coordonnées:', {
                            type: geom.type,
                            hasGeom: !!geom.geom,
                            coordsCount: geom.geom?.coordinates?.length
                        });
                    } else {
                        console.warn('⚠️ Pas de géométries trouvées dans les données');
                    }


                    // ✅ Transformation des SUIVIS DDT (backend → frontend)
                    console.log('📋 Suivis reçus:', projetComplet.suivis);
                    if (projetComplet.suivis && projetComplet.suivis.length > 0) {
                        const historiqueFormate = projetComplet.suivis.map(suivi => ({
                            id: suivi.id,
                            description: suivi.contenu ?? '',
                            dateTime: suivi.dateCreation ?? null,     // ✅ Utiliser dateTime au lieu de date
                            author: suivi.creePar?.nomComplet || suivi.creePar?.username || 'Utilisateur inconnu'  // ✅ Prioriser le nom complet
                        }));

                        setSuiviData({
                            historique: historiqueFormate,
                            suiviDescription: '',
                            enjeuPrioritaire: projetComplet.projet.projetSignale || false,
                            charteAccueil: projetComplet.projet.charteAccueil || false,
                            service_id: projetComplet.serviceDdt?.id || null,
                            contactDDT: projetComplet.projet.referentDdt || '',
                            // 🔥 AJOUT : Champs de métadonnées du projet (conversion ISO → YYYY-MM-DD)
                            dateCreation: projetComplet.projet.dateCreation ? new Date(projetComplet.projet.dateCreation).toISOString().split('T')[0] : '',
                            createur: projetComplet.createur?.nomComplet || projetComplet.createur?.username || '',
                            dateMaj: projetComplet.projet.dateMiseAJour ? new Date(projetComplet.projet.dateMiseAJour).toISOString().split('T')[0] : ''
                        });
                    } else {
                        // Si pas de suivis, initialiser quand même avec les valeurs du projet
                        setSuiviData({
                            historique: [],
                            suiviDescription: '',
                            enjeuPrioritaire: projetComplet.projet.projetSignale || false,
                            charteAccueil: projetComplet.projet.charteAccueil || false,
                            service_id: projetComplet.serviceDdt?.id || null,
                            contactDDT: projetComplet.projet.referentDdt || '',
                            // 🔥 AJOUT : Champs de métadonnées du projet (conversion ISO → YYYY-MM-DD)
                            dateCreation: projetComplet.projet.dateCreation ? new Date(projetComplet.projet.dateCreation).toISOString().split('T')[0] : '',
                            createur: projetComplet.createur?.nomComplet || projetComplet.createur?.username || '',
                            dateMaj: projetComplet.projet.dateMiseAJour ? new Date(projetComplet.projet.dateMiseAJour).toISOString().split('T')[0] : ''
                        });
                    }

                    setStatutData(projetComplet.statut || {});
                    setServiceDdtData(projetComplet.serviceDdt || {});
                    setIsGeneratingId(false);

                    // Réinitialiser l'état des modifications après le chargement
                    setHasUnsavedChanges(false);
                    setDirtySections({});
                    setStaleSections({});
                })
                .catch(error => {
                    console.error('❌ Erreur lors de la récupération du projet:', error);
                    alert('Erreur lors du chargement du projet');
                    setIsGeneratingId(false);
                });
        } else {
            // Mode création : génère un nouvel ID
            generateProjectId();
        }
    }, [id]);

    const fetchSectionMetadata = async (passive = false) => {
        if (!id) return;

        try {
            const response = await fetch(`${API_BASE_URL}/api/project-sections?idProjet=${encodeURIComponent(id)}`, {
                headers: getApiHeaders()
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Erreur de chargement des métadonnées de sections');
            }

            const serverMeta = result.data || {};
            setSectionMeta((prev) => {
                const next = { ...prev };

                Object.entries(serverMeta).forEach(([sectionName, meta]) => {
                    const isDirty = !!dirtySections[sectionName];
                    const previousRevision = prev[sectionName]?.revision;

                    if (isDirty && previousRevision !== undefined && meta.revision > previousRevision) {
                        setStaleSections((current) => ({ ...current, [sectionName]: true }));
                        next[sectionName] = {
                            ...prev[sectionName],
                            lock: meta.lock
                        };
                    } else {
                        next[sectionName] = meta;
                    }
                });

                return next;
            });

            if (!passive) {
                const locks = {};
                Object.entries(serverMeta).forEach(([sectionName, meta]) => {
                    if (meta.lock?.user?.id === currentUser?.id_user) {
                        locks[sectionName] = true;
                    }
                });
                setLockedSections((prev) => ({ ...prev, ...locks }));
            }
        } catch (error) {
            console.error('❌ Erreur chargement métadonnées sections:', error);
        }
    };

    useEffect(() => {
        if (id && !isGeneratingId) {
            fetchSectionMetadata();
        }
    }, [id, isGeneratingId, currentUser]);

    useEffect(() => {
        if (!id) return undefined;

        const interval = setInterval(() => {
            fetchSectionMetadata(true);
        }, 30000);

        return () => clearInterval(interval);
    }, [id, dirtySections, currentUser]);


    // Récupérer l'utilisateur connecté depuis le localStorage
    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setCurrentUser(user);
        }
    }, []);

    // Protection contre la perte de données non sauvegardées (fermeture/rechargement de page)
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = ''; // Chrome nécessite de définir returnValue
                return ''; // Pour les navigateurs plus anciens
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasUnsavedChanges]);

    // Protection contre la navigation arrière (bouton retour du navigateur)
    useEffect(() => {
        if (!hasUnsavedChanges) return;

        const handlePopState = (e) => {
            if (!showExitModal) {
                // Empêcher la navigation en remettant l'état dans l'historique
                e.preventDefault();
                window.history.pushState(null, '', window.location.href);
                // Afficher le modal de confirmation
                setShowExitModal(true);
            }
        };

        // Ajouter un état dans l'historique pour détecter les popstate
        window.history.pushState(null, '', window.location.href);
        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [hasUnsavedChanges, showExitModal]);


    const suiviFormData = {
        numeroDossier: projetData.id_projet,
        dateCreation: new Date().toISOString().slice(0, 10),
        dateMaj: new Date().toISOString().slice(0, 10),
        createur: currentUser?.nom_complet || currentUser?.username || 'User',
        ...suiviData
    };

    const markSectionDirty = async (sectionName) => {
        setHasUnsavedChanges(true);
        setDirtySections((prev) => ({ ...prev, [sectionName]: true }));
    };

    const buildSectionPayload = (sectionName) => {
        switch (sectionName) {
            case 'projet_info':
                return {
                    nom_projet: projetData.nom_projet || 'Nouveau projet',
                    description: projetData.description || '',
                    statut_projet_id: projetData.statut_projet_id ?? null,
                    date_ident_projet: projetData.date_ident_projet ?? null
                };
            case 'porteurs':
                return (porteursData || [])
                    .filter((p) => p.type_porteur_id || p.nom_structure || p.referent_nom)
                    .map((p) => ({
                        type_porteur_id: parseInt(p.type_porteur_id, 10) || null,
                        autre_type_porteur: p.autre_type_porteur || null,
                        nom_structure: p.nom_structure,
                        referent_nom: p.referent_nom || null,
                        referent_fonction: p.referent_fonction || null,
                        referent_email: p.referent_email || null,
                        referent_tel: p.referent_tel || null
                    }));
            case 'suivis':
                return {
                    enjeuPrioritaire: suiviData.enjeuPrioritaire ?? false,
                    charteAccueil: suiviData.charteAccueil ?? false,
                    service_id: suiviData.service_id ?? null,
                    contactDDT: suiviData.contactDDT ?? null,
                    historique: Array.isArray(suiviData.historique)
                        ? suiviData.historique.map((item) => ({
                            description: item.description,
                            dateTime: item.dateTime || item.modifiedAt || new Date().toISOString()
                        }))
                        : []
                };
            case 'thematiques':
                return Array.isArray(thematiqueData)
                    ? thematiqueData
                        .filter((them) => them.id_thematique)
                        .map((thematique) => ({
                            id_thematique: thematique.id_thematique,
                            modele: thematique.modele,
                            fields: thematique.fields && Object.keys(thematique.fields).length > 0
                                ? thematique.fields
                                : (thematique.data || {}),
                            commentaires: thematique.commentaires || '',
                            ajoute_par: currentUser?.id_user
                        }))
                    : [];
            case 'documents':
                return Array.isArray(documentsData)
                    ? documentsData
                        .filter((doc) => doc.lien_local || doc.lien_web)
                        .map((doc) => ({
                            lien_local: doc.lien_local || null,
                            lien_web: doc.lien_web || null
                        }))
                    : [];
            case 'geometrie':
                return geometryData ? {
                    geom: geometryData.geom,
                    geom_type: geometryData.geom_type
                } : null;
            default:
                return null;
        }
    };

    const applySavedSectionData = (sectionName, payload) => {
        if (sectionName === 'geometrie' && payload) {
            setGeometryData((prev) => ({
                ...prev,
                id_geom: payload.id_geom || prev?.id_geom,
                geom: payload.geom || prev?.geom,
                geom_type: payload.geom_type || prev?.geom_type,
                area_m2: payload.area_m2,
                length_m: payload.length_m,
                communes_traversees: payload.communes_traversees || [],
                codes_insee: payload.codes_insee || [],
                epci: payload.epci || [],
                arrondissements: payload.arrondissements || [],
                deputes: payload.deputes || [],
                maires: payload.maires || []
            }));
        }
    };

    const saveExistingProjectSection = async (sectionName) => {
        if (!id) return false;

        setSavingSections((prev) => ({ ...prev, [sectionName]: true }));

        try {
            const response = await fetch(`${API_BASE_URL}/api/project-sections`, {
                method: 'PUT',
                headers: getApiHeaders(),
                body: JSON.stringify({
                    idProjet: id,
                    sectionName,
                    expectedRevision: sectionMeta[sectionName]?.revision ?? 0,
                    sectionData: buildSectionPayload(sectionName)
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                if (response.status === 409) {
                    setStaleSections((prev) => ({ ...prev, [sectionName]: true }));
                    alert(`Conflit détecté sur "${SECTION_LABELS[sectionName]}". Un autre agent a sauvegardé cette section avant vous. Rechargez la section avant de réessayer.`);
                    await fetchSectionMetadata();
                    return false;
                }

                if (response.status === 423) {
                    const holder = result.lock?.user?.nom_complet || result.lock?.user?.username || 'un autre agent';
                    alert(`Impossible d’enregistrer "${SECTION_LABELS[sectionName]}" pour le moment : ${holder} est déjà en train de sauvegarder cette section.`);
                    await fetchSectionMetadata();
                    return false;
                }

                throw new Error(result.message || `Erreur lors de l’enregistrement de la section ${SECTION_LABELS[sectionName]}`);
            }

            applySavedSectionData(sectionName, result.data?.sectionData);
            setSectionMeta((prev) => ({ ...prev, [sectionName]: result.data?.metadata || prev[sectionName] }));
            setDirtySections((prev) => ({ ...prev, [sectionName]: false }));
            setStaleSections((prev) => ({ ...prev, [sectionName]: false }));

            const hasRemainingDirty = Object.entries({
                ...dirtySections,
                [sectionName]: false
            }).some(([, isDirty]) => !!isDirty);
            setHasUnsavedChanges(hasRemainingDirty);
            return true;
        } catch (error) {
            console.error(`❌ Erreur sauvegarde section ${sectionName}:`, error);
            alert(error.message);
            return false;
        } finally {
            setSavingSections((prev) => ({ ...prev, [sectionName]: false }));
        }
    };

    const handleSaveProject = async () => {
        if (!projetData.id_projet || !currentUser?.id_user) {
            alert('ID du projet manquant ou utilisateur non connecté.');
            return;
        }

        if (id) {
            const dirtySectionNames = Object.keys(dirtySections).filter((sectionName) => dirtySections[sectionName]);
            if (dirtySectionNames.length === 0) {
                alert('Aucune section modifiée à enregistrer.');
                return;
            }

            setIsSaving(true);
            try {
                for (const sectionName of dirtySectionNames) {
                    const success = await saveExistingProjectSection(sectionName);
                    if (!success) {
                        return;
                    }
                }
                alert('✅ Les sections modifiées ont été enregistrées avec succès.');
                navigate('/projets/liste', {
                    state: { refresh: true }
                });
            } finally {
                setIsSaving(false);
            }
            return;
        }

        setIsSaving(true);

        try {
            console.log('🔍 ========== DEBUG FRONTEND AVANT ENVOI ==========');
            console.log('1. État suiviData:', suiviData);
            console.log('2. État porteursData:', porteursData);
            console.log('3. État thematiqueData:', thematiqueData);
            console.log('4. État documentsData:', documentsData);
            console.log('5. État geometryData:', geometryData);

            // Construction du payload pour les suivis
            const suivisMapped = Array.isArray(suiviData.historique)
                ? suiviData.historique.map(item => {
                    console.log('📝 Mapping suivi item:', item);
                    return {
                        suivi: item.description,
                        created_by: currentUser.id_user
                    };
                })
                : [];

            console.log('6. Suivis après mapping:', suivisMapped);

            // Construction du payload pour les porteurs

            console.log('📋 porteursData brut:', JSON.stringify(porteursData, null, 2));


            const porteursMapped = (porteursData || [])
                .filter(p => p.type_porteur_id || p.nom_structure || p.referent_nom)
                .map(p => ({
                    type_porteur_id: parseInt(p.type_porteur_id, 10),
                    autre_type_porteur: p.autre_type_porteur || null,
                    nom_structure: p.nom_structure,
                    referent_nom: p.referent_nom || null,
                    referent_fonction: p.referent_fonction || null,
                    referent_email: p.referent_email || null,
                    referent_tel: p.referent_tel || null
                }));

            console.log('7. Porteurs après mapping:', porteursMapped);

            // Construction du payload pour les thématiques
            const thematiquesMapped = Array.isArray(thematiqueData)
                ? thematiqueData
                    .filter(them => them.id_thematique)
                    .map(thematique => {
                        console.log('🏷️ Mapping thématique:', thematique);

                        // S'assurer que fields n'est jamais vide
                        const fields = thematique.fields && Object.keys(thematique.fields).length > 0
                            ? thematique.fields
                            : (thematique.data || {});  // Fallback si fields est vide

                        console.log('   ✅ Fields après vérification:', fields);

                        return {
                            id_thematique: thematique.id_thematique ,
                            modele: thematique.modele,
                            fields: fields,
                            commentaires: thematique.commentaires,
                            ajoute_par: currentUser.id_user
                        };
                    })
                    .filter(them => Object.keys(them.fields).length > 0)
                : [];

            console.log('8. Thématiques après mapping:', thematiquesMapped);

            // Construction du payload pour les documents
            const documentsMapped = Array.isArray(documentsData)
                ? documentsData
                    .filter(doc => doc.lien_local || doc.lien_web)
                    .map(doc => {
                        console.log('📄 Mapping document:', doc);
                        return {
                            lien_local: doc.lien_local || null,
                            lien_web: doc.lien_web || null
                        };
                    })
                : [];

            console.log('9. Documents après mapping:', documentsMapped);

            // Construction du payload final
            const finalPayload = {
                id_projet: projetData.id_projet,
                nom_projet: projetData.nom_projet || 'Nouveau projet',
                description: projetData.description || '',
                statut_projet_id: projetData.statut_projet_id ?? null,
                date_ident_projet: projetData.date_ident_projet ?? null,
                // 🔥 CORRECTION: created_by uniquement en mode création (pas en mode édition)
                ...(id ? {} : { created_by: currentUser.id_user }),
                updated_by: currentUser.id_user,
                service_id: suiviData.service_id ?? null,
                projet_signale: suiviData.enjeuPrioritaire ?? false,
                charte_accueil: suiviData.charteAccueil ?? false,
                referent_ddt: suiviData.contactDDT ?? null,

                // Données mappées
                suivis: suivisMapped,
                porteurs: porteursMapped,
                thematiques: thematiquesMapped,
                documents: documentsMapped,

                geometry: geometryData ? {
                    geom: geometryData.geom,
                    geom_type: geometryData.geom_type,
                    area_m2: geometryData.area_m2,
                    length_m: geometryData.length_m,

                    communes_traversees: typeof geometryData.communes_traversees === 'string'
                        ? geometryData.communes_traversees.split(',').map(c => c.trim())
                        : (Array.isArray(geometryData.communes_traversees) ? geometryData.communes_traversees : []),

                    codes_insee: Array.isArray(geometryData.codes_insee) ? geometryData.codes_insee : [],
                    epci: Array.isArray(geometryData.epci) ? geometryData.epci : [],
                    arrondissements: Array.isArray(geometryData.arrondissements) ? geometryData.arrondissements : [],
                    deputes: Array.isArray(geometryData.deputes) ? geometryData.deputes : [],
                    maires: Array.isArray(geometryData.maires) ? geometryData.maires : []
                } : null,
            };

            // 🔐 Ajouter l'userId pour le système de versioning
            const userId = getCurrentUserId();
            if (userId) {
                finalPayload.userId = userId;
                console.log(`🔐 userId ajouté au payload: ${userId}`);
            } else {
                console.warn('⚠️ Aucun userId trouvé - versioning désactivé pour cette requête');
            }

            console.log('10. 🚀 PAYLOAD FINAL À ENVOYER:', JSON.stringify(finalPayload, null, 2));
            console.log('================================================\n');

            // --- 3. Envoyer le payload complet en un seul appel API ---
            const response = await fetch(`${API_BASE_URL}/api/projets`, {
                method: 'POST',
                headers: getApiHeaders(),
                body: JSON.stringify(finalPayload),
            });

            const result = await response.json();

            // --- 4. Gérer la réponse du serveur ---
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Erreur inconnue lors de la sauvegarde.');
            }

            alert(`✅ Projet et toutes ses données enregistrés avec succès ! (ID: ${result.data.id_projet})`);

            // Réinitialiser l'état des modifications non sauvegardées
            setHasUnsavedChanges(false);

            navigate('/projets/liste', {
                state: { refresh: true }
            });


        } catch (error) {
            console.error("❌ Erreur critique lors de la sauvegarde:", error);
            alert(`Une erreur est survenue: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDocumentChange = (documents) => {
        console.log('📄 Documents reçus:', documents);
        setDocumentsData(documents);
        markSectionDirty('documents');
    };

    const handleGeometryUpdate = (newGeometryData) => {
        setGeometryData(newGeometryData);
        if (id) {
            markSectionDirty('geometrie');
        } else {
            setHasUnsavedChanges(true);
        }
        if (newGeometryData) {
            setProjetData(prev => ({
                ...prev,
                superficie_ou_longueur: newGeometryData.superficie_ou_longueur,
                // ... autres champs si nécessaire
            }));
        }
    };

    const handleProjectDataUpdate = (newData) => {
        setProjetData(prev => ({ ...prev, ...newData }));
        if (id) {
            markSectionDirty('projet_info');
        } else {
            setHasUnsavedChanges(true);
        }
    };

    const handleThematiqueChange = (newThematiques) => {
        console.log("📥 FormulairePage - Thématiques reçues:", newThematiques);
        setThematiqueData(newThematiques);
        if (id) {
            markSectionDirty('thematiques');
        } else {
            setHasUnsavedChanges(true);
        }
    };

    // Wrappers pour suivis et porteurs pour détecter les changements
    const handlePorteursChange = (newPorteurs) => {
        setPorteursData(newPorteurs);
        if (id) {
            markSectionDirty('porteurs');
        } else {
            setHasUnsavedChanges(true);
        }
    };

    const handleSuiviChange = (newSuivi) => {
        setSuiviData(newSuivi);
        if (id) {
            markSectionDirty('suivis');
        } else {
            setHasUnsavedChanges(true);
        }
    };

    const renderSectionActions = (sectionName) => {
        if (!id) return null;

        const meta = sectionMeta[sectionName];
        const lockUser = meta?.lock?.user;
        const lockedByOther = lockUser && lockUser.id !== currentUser?.id_user;
        const isDirty = !!dirtySections[sectionName];
        const isSavingSection = !!savingSections[sectionName];
        const isStale = !!staleSections[sectionName];

        return (
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                margin: '0.5rem 0 1.25rem 0',
                padding: '0.75rem 1rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                background: '#f8fafc'
            }}>
                <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                    {lockedByOther
                        ? `En cours de modification par ${lockUser.nom_complet || lockUser.username}`
                        : isStale
                            ? 'Une autre sauvegarde a eu lieu sur cette section. Recharge requise avant enregistrement.'
                            : isDirty
                                ? 'Modifications locales non enregistrées.'
                                : 'Section synchronisée.'}
                </div>
                <button
                    type="button"
                    onClick={() => saveExistingProjectSection(sectionName)}
                    disabled={!isDirty || lockedByOther || isSavingSection}
                    style={{
                        padding: '0.55rem 1rem',
                        backgroundColor: (!isDirty || lockedByOther || isSavingSection) ? '#94A3B8' : '#2563EB',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: (!isDirty || lockedByOther || isSavingSection) ? 'not-allowed' : 'pointer',
                        fontWeight: 600
                    }}
                >
                    {isSavingSection ? 'Enregistrement...' : `Enregistrer ${SECTION_LABELS[sectionName]}`}
                </button>
            </div>
        );
    };

    // Gestion du modal de sortie
    const handleSaveAndExit = async () => {
        await handleSaveProject();
        // La navigation se fait déjà dans handleSaveProject après la sauvegarde
        setShowExitModal(false);
    };

    const handleExitWithoutSaving = () => {
        setHasUnsavedChanges(false);
        setShowExitModal(false);
        navigate('/projets/liste');
    };

    const handleCancelExit = () => {
        setShowExitModal(false);
    };

    return (
        <>
        {/* Modal de confirmation de sortie */}
        {showExitModal && (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999
            }}>
                <div style={{
                    backgroundColor: 'white',
                    padding: '2rem',
                    borderRadius: '8px',
                    maxWidth: '500px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}>
                    <h3 style={{ marginTop: 0, color: '#DC2626' }}>⚠️ Modifications non enregistrées</h3>
                    <p style={{ marginBottom: '1.5rem', lineHeight: '1.6' }}>
                        Vous êtes sur le point de fermer le formulaire de modification.<br />
                        <strong>Vous avez des modifications non enregistrées.</strong><br />
                        Si vous continuez sans enregistrer, toutes les modifications seront perdues.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button
                            onClick={handleCancelExit}
                            style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: '#6B7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleExitWithoutSaving}
                            style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: '#DC2626',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            Quitter sans enregistrer
                        </button>
                        <button
                            onClick={handleSaveAndExit}
                            disabled={isSaving}
                            style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: isSaving ? '#9CA3AF' : '#10B981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: isSaving ? 'not-allowed' : 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Contenu principal */}
        <div style={{ display: 'flex', gap: '2rem' }}>
            {/* Colonne gauche - Formulaire */}
            <div style={{ flex: '1' }}>
                <Id
                    value={projetData}
                    isGenerating={isGeneratingId}
                />
                <InfosProjetSection
                    value={projetData}
                    onChange={handleProjectDataUpdate}
                />
                {renderSectionActions('projet_info')}

                {/* Afficher un loader si les données sont en cours de chargement */}
                {id && isGeneratingId ? (
                    <div style={{
                        padding: '2rem',
                        textAlign: 'center',
                        color: '#6b7280',
                        fontStyle: 'italic'
                    }}>
                        Chargement des données du projet...
                    </div>
                ) : (
                    <>
                        <PorteurContact
                            value={porteursData}
                            onChange={handlePorteursChange}
                        />
                        {renderSectionActions('porteurs')}
                        <SuiviDdtSection
                            value={suiviFormData}
                            onChange={handleSuiviChange}
                        />
                        {renderSectionActions('suivis')}
                        <ThematiqueModele
                            value={thematiqueData}
                            onThematiqueChange={handleThematiqueChange}
                        />
                        {renderSectionActions('thematiques')}
                        <Document
                            value={documentsData}
                            onChange={handleDocumentChange}
                        />
                        {renderSectionActions('documents')}
                    </>
                )}

                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        type="button"
                        onClick={handleSaveProject}
                        disabled={isSaving || isGeneratingId}
                        style={{
                            padding: '0.75rem 1.5rem',
                            backgroundColor: isSaving ? '#9CA3AF' : '#3B82F6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            cursor: (isSaving || isGeneratingId) ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold',
                        }}
                    >
                        {isSaving ? 'Enregistrement en cours...' : (id ? 'Enregistrer les sections modifiées' : 'Enregistrer le projet')}
                    </button>
                </div>
            </div>

            {/* Colonne droite - Carte */}
            <div style={{ flex: '2' }}>
                <MapPage
                    projetData={projetData}
                    projectId={projetData.id_projet}
                    geometryData={geometryData}
                    onGeometryUpdate={handleGeometryUpdate}
                />
                {renderSectionActions('geometrie')}
            </div>
        </div>
        </>
    );
}
