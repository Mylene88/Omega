// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic';

// backend/app_backup/api/geometry-temp/route.js
import { NextResponse } from 'next/server';
import sequelize from '@/backend/config/database';
import { QueryTypes } from 'sequelize';

export async function POST(request) {
    try {
        const { project_id, geom, geom_type } = await request.json();

        console.log('Analyse temporaire:', {
            project_id,
            geom_type,
            hasGeom: !!geom
        });

        if (!geom || !geom_type) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Données manquantes (geom et geom_type requis)'
                },
                { status: 400 }
            );
        }

        const geomWKT = `ST_GeomFromGeoJSON('${JSON.stringify(geom)}')`;

        const geomStats = await sequelize.query(
            `SELECT
                ST_GeometryType(${geomWKT}) as geom_type,
                ST_Area(ST_Transform(${geomWKT}, 2154)) as area,
                ST_Length(ST_Transform(${geomWKT}, 2154)) as length
            `,
            { type: QueryTypes.SELECT }
        );

        const { area, length } = geomStats[0] || {};
        const area_m2 = (geom_type?.includes('Polygon')) ? parseFloat(area) || 0 : null;
        const length_m = (geom_type?.includes('LineString')) ? parseFloat(length) || 0 : null;

        const intersectedCommunes = await sequelize.query(
            `SELECT gc.nom_com, gc.code_insee, gc.nom_epci, gc.arrondisst,
                    gc.maire_prenom, gc.maire_nom, gc.depute_prenom, gc.depute_nom,
                    ST_Area(ST_Intersection(
                        gc.geom, 
                        ST_Transform(${geomWKT}, ST_SRID(gc.geom))
                    )) as intersection_area
             FROM externe.geom_commune gc
             WHERE ST_Intersects(
                 gc.geom, 
                 ST_Transform(${geomWKT}, ST_SRID(gc.geom))
             )
             AND gc.code_dep = '28'
             ORDER BY intersection_area DESC`,
            { type: QueryTypes.SELECT }
        );

        const communes_traversees = intersectedCommunes.map(c => c.nom_com?.trim()).filter(Boolean);
        const codes_insee = [...new Set(intersectedCommunes.map(c => c.code_insee?.trim()).filter(Boolean))];
        const epci = [...new Set(intersectedCommunes.map(c => c.nom_epci?.trim()).filter(Boolean))];
        const arrondissements = [...new Set(intersectedCommunes.map(c => c.arrondisst?.trim()).filter(Boolean))];

        const deputes = [...new Set(intersectedCommunes
            .filter(c => c.depute_prenom && c.depute_nom)
            .map(c => `${c.depute_prenom.trim()} ${c.depute_nom.trim()}`)
        )];

        const maires = [...new Set(intersectedCommunes
            .filter(c => c.maire_prenom && c.maire_nom)
            .map(c => `${c.maire_prenom.trim()} ${c.maire_nom.trim()}`)
        )];

        let superficie_ou_longueur = '';
        if (area_m2 !== null && area_m2 > 0) {
            superficie_ou_longueur = area_m2 >= 10000
                ? `${(area_m2 / 10000).toFixed(2)} ha`
                : `${Math.round(area_m2)} m²`;
        } else if (length_m !== null && length_m > 0) {
            superficie_ou_longueur = length_m >= 1000
                ? `${(length_m / 1000).toFixed(2)} km`
                : `${Math.round(length_m)} m`;
        }

        return NextResponse.json({
            success: true,
            message: `Analyse temporaire réussie - ${communes_traversees.length} commune(s) concernée(s)`,
            data: {
                project_id,
                geom,
                geom_type,
                area_m2,
                length_m,
                superficie_ou_longueur,
                communes_traversees,
                communes_list: communes_traversees.join(', '),
                codes_insee,
                epci,
                arrondissements,
                arrondissements_list: arrondissements.join(', '),
                deputes,
                deputes_list: deputes.join(', '),
                maires,
                maires_list: maires.join(', '),
                intersectedCommunes
            }
        });

    } catch (error) {
        console.error('Erreur analyse géométrie temporaire:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Erreur lors de l\'analyse spatiale temporaire',
                details: error.message,
                type: 'geometry_temp_error'
            },
            { status: 500 }
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
        },
    });
}