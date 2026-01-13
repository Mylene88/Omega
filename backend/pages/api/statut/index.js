// Force dynamic rendering (no static generation at build time)

// backend/statut/route.js
import db from '../../../models';

const { StatutProjetEnum, sequelize } = db;

const COLOR_BY_LIBELLE = {
    'phase amont':      { color: '#17a2b8', fillColor: '#17a2b8' }, // cyan
    'en cours':         { color: '#f1c40f', fillColor: '#f1c40f' }, // jaune
    'finalisé':         { color: '#2ecc71', fillColor: '#2ecc71' }, // vert
    'en exploitation':  { color: '#3498db', fillColor: '#3498db' }, // bleu
    'abandonné':        { color: '#e74c3c', fillColor: '#e74c3c' }, // rouge
    'en contentieux':   { color: '#8e44ad', fillColor: '#8e44ad' }, // violet
    default:            { color: '#95a5a6', fillColor: '#95a5a6' }, // gris
};

function normLabel(s) {
    return String(s || '').trim().toLowerCase();
}



// Optionnel: endpoint mapping couleurs


export default async function handler(req, res) {
  if (req.method === 'GET') {

    try {
        // Ordre personnalisé : Phase amont, En cours, En contentieux, Finalisé, En exploitation, Abandonné
        const statuses = await StatutProjetEnum.findAll({
            attributes: ['id_statut', 'libelle'],
            order: [
                [
                    sequelize.literal(`
                        CASE LOWER(libelle)
                            WHEN 'phase amont' THEN 1
                            WHEN 'en cours' THEN 2
                            WHEN 'en contentieux' THEN 3
                            WHEN 'finalisé' THEN 4
                            WHEN 'en exploitation' THEN 5
                            WHEN 'abandonné' THEN 6
                            ELSE 7
                        END
                    `),
                    'ASC'
                ]
            ]
        });
        return res.status(200 ).json(statuses);
    } catch (error) {
        console.error('Erreur lors de la récupération des statuts:', error);
        return res.json(
            { error: 'Impossible de récupérer les statuts du projet' },
            { status: 500 }
        );
    }
  }
  else if (req.method === 'POST') {

    // Renvoie le mapping couleurs pour ne pas le dupliquer côté front
    try {
        const payload = req.body.catch(() => ({}));
        const { labels = [] } = payload;
        const map = {};
        labels.forEach((l) => {
            const k = normLabel(l);
            map[k] = COLOR_BY_LIBELLE[k] || COLOR_BY_LIBELLE.default;
        });
        return res.status(200 ).json({ colors: map });
    } catch (e) {
        return res.status(200 ).json({ colors: COLOR_BY_LIBELLE });
    }
  }
  else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}
