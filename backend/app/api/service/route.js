//backend/statut/route.js

import { NextResponse } from 'next/server';
import db from '@/backend/models';  

const { DdtServiceEnum } = db;

export async function GET() {
    try {
        const services = await DdtServiceEnum.findAll ({
            attributes: ['id_service', 'libelle_service'],
            order: [['libelle_service', 'ASC']]
        })

        return NextResponse.json(services, { status: 200})

    } catch (error) {
        console.error ('Erreur lors de la récupération des services:', error)

        return NextResponse.json (
            { error: 'Impossible de récupérer les services du projet'},
            { status: 500}
        )
    }
}