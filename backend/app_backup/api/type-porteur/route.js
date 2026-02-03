// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic';

// backend/app_backup/api/type-porteur/route.js

import { NextResponse } from 'next/server';
import db from '@/backend/models';

const { TypePorteurEnum } = db;

export async function GET() {
    try {
        const types = await TypePorteurEnum.findAll({
            attributes: ['id_type_porteur', 'libelle'],
            order: [['id_type_porteur', 'ASC']]
        });

        return NextResponse.json(types, { status: 200 });
    } catch (error) {
        console.error('Erreur GET /api/type-porteur:', error);
        return NextResponse.json({ error: 'Impossible de récupérer les types de porteurs' }, { status: 500 });
    }
}
