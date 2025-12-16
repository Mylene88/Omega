// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic';

// app/api/geo-entities/route.js
import { NextResponse } from 'next/server';
import sequelize from '@/backend/config/database';
import { QueryTypes } from 'sequelize';

export async function GET() {
    try {
        // Requête pour récupérer toutes les entités géographiques avec leurs centroïdes
        const geoEntities = await sequelize.query(
            `SELECT 
        nom_com as nom,
        code_insee as "codeInsee",
        arrondisst as arrondissement,
        nom_epci as epci,
        ST_Y(ST_Centroid(ST_Transform(geom, 4326))) as lat,
        ST_X(ST_Centroid(ST_Transform(geom, 4326))) as lng
       FROM externe.geom_commune
       WHERE code_dep = '28'
       ORDER BY nom_com`,
            {
                type: QueryTypes.SELECT
            }
        );

        // Formater les données pour le composant Search
        const formattedData = geoEntities.map(entity => ({
            nom: entity.nom,
            codeInsee: entity.codeInsee,
            arrondissement: entity.arrondissement || '',
            epci: entity.epci || '',
            coordonnees: {
                lat: parseFloat(entity.lat),
                lng: parseFloat(entity.lng)
            }
        }));

        return NextResponse.json(formattedData, { status: 200 });

    } catch (error) {
        console.error('Erreur lors de la récupération des entités géographiques:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Erreur lors de la récupération des données géographiques',
                details: error.message
            },
            { status: 500 }
        );
    }
}