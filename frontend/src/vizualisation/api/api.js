// frontend/src/visualisation/api/api.js

// ✅ URL de base de l'API backend (port 3000)
const API_BASE_URL = 'http://localhost:3000';

export async function fetchProjectGeometries({ limit = 1000, offset = 0 } = {}) {
    const res = await fetch(`${API_BASE_URL}/api/projet-geometry?limit=${limit}&offset=${offset}`, {
        cache: 'no-store'
    });

    if (!res.ok) throw new Error('Erreur chargement géométries');

    const json = await res.json();
    const features = (json.data || []).flatMap((g) => {
        if (!g.geom) return [];

        const props = {
            // ✅ IMPORTANT : Stocker id_projet dans les propriétés
            id_projet: g.id_projet || g.projet?.id_projet, // Pour identifier le projet
            id_geom: g.id_geom,                             // Pour identifier la géométrie
            nom_projet: g.projet?.nom_projet || 'Projet',
            description: g.projet?.description || '',
            commune: Array.isArray(g.communes_traversees) ? g.communes_traversees[0] : null,
            statut: g.projet?.statut_projet_enum?.libelle || null,
            service: g.projet?.ddt_service_enum?.libelle_service || null,
            nbThematiques: Array.isArray(g.projet_in_thematique) ? g.projet_in_thematique.length : undefined,
        };

        return [{ type: 'Feature', geometry: g.geom, properties: props }];
    });

    return { type: 'FeatureCollection', features };
}


export async function fetchProjectGeometryByProjectId(projetId) {
    // ✅ Accepter soit une string, soit un objet avec id_projet
    let id;

    if (!projetId) {
        throw new Error('ID projet manquant');
    }

    if (typeof projetId === 'object') {
        // Si c'est un objet, extraire l'ID
        id = projetId.id_projet || projetId.id;
        console.log('📦 Objet reçu, extraction de l\'ID:', id);
    } else if (typeof projetId === 'string') {
        // Si c'est déjà une string, l'utiliser directement
        id = projetId;
    } else {
        console.error('❌ Type invalide:', typeof projetId, projetId);
        throw new Error('ID projet invalide : type non supporté');
    }

    if (!id) {
        throw new Error('ID projet invalide : ID manquant dans l\'objet');
    }

    const idString = String(id).trim();
    console.log('📡 Appel API fetchProjectGeometryByProjectId - ID:', idString);

    const url = `${API_BASE_URL}/api/projet-geometry?projet_id=${encodeURIComponent(idString)}`;
    console.log('🌐 URL appelée:', url);

    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Erreur API:', res.status);
        throw new Error(`Erreur ${res.status}: Impossible de charger le projet`);
    }

    const json = await res.json();
    console.log('✅ Données projet reçues:', json);

    return json;
}

// ✅ OPTIONNEL : Fonction pour récupérer les détails d'une GÉOMÉTRIE spécifique (par son id_geom)
export async function fetchGeometryById(geomId) {
    if (!geomId) {
        throw new Error('ID géométrie manquant');
    }

    const id = String(geomId).trim();
    console.log('📡 Appel API fetchGeometryById - ID géométrie:', id);

    const url = `${API_BASE_URL}/api/projet-geometry/${encodeURIComponent(id)}`;
    console.log('🌐 URL appelée:', url);

    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Erreur API:', res.status);
        throw new Error(`Erreur ${res.status}: Impossible de charger la géométrie`);
    }

    const json = await res.json();
    console.log('✅ Données géométrie reçues:', json);

    return json;
}
