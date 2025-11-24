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
            const res = await fetch('http://localhost:3000/api/projets/generate-id');
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
            fetch(`http://localhost:3000/api/projets/${id}`)
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


    // Récupérer l'utilisateur connecté depuis le localStorage
    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setCurrentUser(user);
        }
    }, []);

    // Protection contre la perte de données non sauvegardées
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


    const suiviFormData = {
        numeroDossier: projetData.id_projet,
        dateCreation: new Date().toISOString().slice(0, 10),
        dateMaj: new Date().toISOString().slice(0, 10),
        createur: currentUser?.nom_complet || currentUser?.username || 'User',
        ...suiviData
    };


    const handleSaveProject = async () => {
        if (!projetData.id_projet || !currentUser?.id_user) {
            alert('ID du projet manquant ou utilisateur non connecté.');
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

            console.log('10. 🚀 PAYLOAD FINAL À ENVOYER:', JSON.stringify(finalPayload, null, 2));
            console.log('================================================\n');

            // --- 3. Envoyer le payload complet en un seul appel API ---
            const response = await fetch('http://localhost:3000/api/projets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
        setHasUnsavedChanges(true);
    };

    const handleGeometryUpdate = (newGeometryData) => {
        setGeometryData(newGeometryData);
        setHasUnsavedChanges(true);
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
        setHasUnsavedChanges(true);
    };

    const handleThematiqueChange = (newThematiques) => {
        console.log("📥 FormulairePage - Thématiques reçues:", newThematiques);
        setThematiqueData(newThematiques);
        setHasUnsavedChanges(true);
    };

    // Wrappers pour suivis et porteurs pour détecter les changements
    const handlePorteursChange = (newPorteurs) => {
        setPorteursData(newPorteurs);
        setHasUnsavedChanges(true);
    };

    const handleSuiviChange = (newSuivi) => {
        setSuiviData(newSuivi);
        setHasUnsavedChanges(true);
    };

    return (
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
                        <SuiviDdtSection
                            value={suiviFormData}
                            onChange={handleSuiviChange}
                        />
                        <ThematiqueModele
                            value={thematiqueData}
                            onThematiqueChange={handleThematiqueChange}
                        />
                        <Document
                            value={documentsData}
                            onChange={handleDocumentChange}
                        />
                    </>
                )}

                <button
                    type="button"
                    onClick={handleSaveProject}
                    disabled={isSaving || isGeneratingId}
                    style={{
                        marginTop: '1rem', padding: '0.75rem 1.5rem',
                        backgroundColor: isSaving ? '#9CA3AF' : '#3B82F6',
                        color: 'white', border: 'none', borderRadius: '0.5rem',
                        cursor: (isSaving || isGeneratingId) ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                    }}
                >
                    {isSaving ? 'Enregistrement en cours...' : 'Enregistrer le projet'}
                </button>
            </div>

            {/* Colonne droite - Carte */}
            <div style={{ flex: '2' }}>
                <MapPage
                    projetData={projetData}
                    projectId={projetData.id_projet}
                    geometryData={geometryData}
                    onGeometryUpdate={handleGeometryUpdate}
                />
            </div>
        </div>
    );
}