// Force dynamic rendering (no static generation at build time)

//backend/statut/route.js

import db from '../../../models';  

const { DdtServiceEnum } = db;


export default async function handler(req, res) {
  if (req.method === 'GET') {

    try {
        const services = await DdtServiceEnum.findAll ({
            attributes: ['id_service', 'libelle_service'],
            order: [['libelle_service', 'ASC']]
        })

        return res.status(200).json(services)

    } catch (error) {
        console.error ('Erreur lors de la récupération des services:', error)

        return NextResponse.json (
            { error: 'Impossible de récupérer les services du projet'},
            { status: 500}
        )
    }
  }
  else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}
