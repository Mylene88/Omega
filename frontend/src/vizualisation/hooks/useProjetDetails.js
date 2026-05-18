// frontend/src/visualisation/hooks/useProjetDetails.js
import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/apiConfig';

export function useProjetDetails(selectedProjectId) {
    const [selectedProjectDetails, setSelectedProjectDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        if (!selectedProjectId) {
            setSelectedProjectDetails(null);
            return;
        }

        const loadDetails = async () => {
            setLoadingDetails(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/projets/${selectedProjectId}`);
                if (!res.ok) throw new Error(`Erreur ${res.status}`);
                const json = await res.json();

                if (json.success && json.data) {
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

                    setSelectedProjectDetails({
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
                        createur: createur || null,
                        updated_at: projet?.dateMiseAJour,

                        suivis: (suivis || []).map((s) => ({
                            id: s.id,
                            texte: s.contenu,
                            date: s.dateCreation,
                            creePar: s.creePar || null
                        })),

                        porteurs: (porteurs || []).map((p) => ({
                            type_porteur: p.typePorteur?.libelle,
                            nom_structure: p.nomStructure,
                            referent_nom: p.referent?.nom,
                            referent_fonction: p.referent?.fonction,
                            referent_email: p.referent?.email,
                            referent_tel: p.referent?.telephone
                        })),

                        thematiques: (thematiques || []).map((t) => ({
                            id: t.id,
                            nom: t.libelle,
                            libelle: t.libelle,
                            dateAjout: t.dateAjout,
                            ajoutePar: t.ajoutePar || null,
                            donnees: t.donnees || {},
                            fieldsMetadataByModel: t.fieldsMetadataByModel || {}
                        })),

                        documents: (documents || []).map((d) => ({
                            id: d.id,
                            lien_local: d.lienLocal,
                            lien_web: d.lienWeb
                        })),

                        geometries: (geometries || []).map((g) => ({
                            id_geom: g.id,
                            type: g.type,
                            surface: g.surface,
                            longueur: g.longueur,
                            communesTraversees: g.communesTraversees || [],
                            codesInsee: g.codesInsee || [],
                            epci: g.epci || [],
                            arrondissements: g.arrondissements || []
                        }))
                    });
                }
            } catch (e) {
                console.error('❌ Erreur chargement détails:', e);
                setSelectedProjectDetails(null);
            } finally {
                setLoadingDetails(false);
            }
        };

        loadDetails();
    }, [selectedProjectId]);

    return { selectedProjectDetails, loadingDetails };
}
