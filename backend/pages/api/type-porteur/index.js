// Force dynamic rendering (no static generation at build time)

// backend/app/api/type-porteur/route.js

import db from '../../../models';

const { TypePorteurEnum } = db;



export default async function handler(req, res) {
  if (req.method === 'GET') {

    try {
        const types = await TypePorteurEnum.findAll({
            attributes: ['id_type_porteur', 'libelle'],
            order: [['id_type_porteur', 'ASC']]
        });

        return res.status(200 ).json(types);
    } catch (error) {
        console.error('Erreur GET /api/type-porteur:', error);
        return res.status(500 ).json({ error: 'Impossible de récupérer les types de porteurs' });
    }
  }
  else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}
