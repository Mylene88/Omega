/**
 * Configuration des couches cartographiques
 * Permet de basculer facilement entre tuiles en ligne (IGN) et tuiles locales
 */

// Mode de tuiles : 'online' ou 'local'
// Pour la DDT, utiliser 'local' après avoir téléchargé les tuiles
const TILE_MODE = process.env.REACT_APP_TILE_MODE || 'online';

// Configuration des tuiles en ligne
// ⚠️ ATTENTION: En production DDT, utiliser le mode 'local' pour environnement cloisonné (ANSSI)
const ONLINE_TILES = {
    plan: {
        // OpenStreetMap France (fonctionne sans clé API)
        url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
        format: 'png',
        minZoom: 0,
        maxZoom: 19,
        attribution: '© OpenStreetMap France | Données © OpenStreetMap',
        subdomains: ['a', 'b', 'c']
    },
    ortho: {
        // Fallback vers plan pour ortho si pas de tuiles IGN disponibles
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        format: 'png',
        minZoom: 0,
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
        subdomains: ['a', 'b', 'c']
    }
};

// Configuration des tuiles locales (pré-téléchargées)
const LOCAL_TILES = {
    plan: {
        url: '/tiles/plan/{z}/{x}/{y}.png',
        format: 'png',
        minZoom: 8,
        maxZoom: 19,
        maxNativeZoom: 14,
        attribution: 'IGN-F/Geoportail (Hors-ligne)'
    },
    ortho: {
        url: '/tiles/ortho/{z}/{x}/{y}.jpg',
        format: 'jpg',
        minZoom: 8,
        maxZoom: 19,
        maxNativeZoom: 14,
        attribution: 'IGN-F/Geoportail (Hors-ligne)'
    }
};

// Sélection automatique selon le mode
export const TILE_CONFIG = TILE_MODE === 'local' ? LOCAL_TILES : ONLINE_TILES;

// Centre et limites pour Eure-et-Loir
export const MAP_CENTER = [48.5525242, 1.1989814];
export const MAP_BOUNDS = [[47.95, 0.45], [48.95, 1.99]];

// Zoom par défaut
export const DEFAULT_ZOOM = 10;

// Informations de debug
console.log(`🗺️ Mode tuiles cartographiques: ${TILE_MODE.toUpperCase()}`);
console.log(`📍 Utilisation des tuiles: ${TILE_MODE === 'local' ? 'LOCALES (hors-ligne)' : 'EN LIGNE (IGN)'}`);

export default {
    TILE_MODE,
    TILE_CONFIG,
    MAP_CENTER,
    MAP_BOUNDS,
    DEFAULT_ZOOM
};
