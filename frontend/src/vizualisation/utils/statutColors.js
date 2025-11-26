// frontend/src/visualisation/utils/statutColors.js
export function normLabel(v) {
    return String(v || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .trim().toLowerCase();
}

// ✅ Couleurs PLUS FONCÉES et CONTRASTÉES pour meilleure visibilité
const COLOR_BY_LABEL = {
    'phase amont':      {
        color: '#0d6986',        // Cyan foncé
        fillColor: '#0d6986',
        badge: 'badge-cyan'
    },
    'en cours':         {
        color: '#c29d0b',        // Jaune foncé/or
        fillColor: '#c29d0b',
        badge: 'badge-yellow'
    },
    'finalise':         {
        color: '#1e7e34',        // Vert foncé
        fillColor: '#1e7e34',
        badge: 'badge-green'
    },
    'en exploitation':  {
        color: '#1c5a85',        // Bleu foncé
        fillColor: '#1c5a85',
        badge: 'badge-blue'
    },
    'abandonne':        {
        color: '#a82315',        // Rouge foncé
        fillColor: '#a82315',
        badge: 'badge-red'
    },
    'en contentieux':   {
        color: '#5e2d6e',        // Violet foncé
        fillColor: '#5e2d6e',
        badge: 'badge-purple'
    },
};

const DEFAULT_STYLE = {
    color: '#5a6268',            // Gris foncé
    fillColor: '#5a6268',
    badge: 'badge-gray'
};

export function getStatusStyle(raw) {
    const key = normLabel(raw);
    const result = COLOR_BY_LABEL[key] || DEFAULT_STYLE;
    console.log('🎨 getStatusStyle:', { input: raw, normalized: key, found: !!COLOR_BY_LABEL[key], result });
    return result;
}

export function getStatusBadgeClass(raw) {
    const key = normLabel(raw);
    return (COLOR_BY_LABEL[key]?.badge) || DEFAULT_STYLE.badge;
}