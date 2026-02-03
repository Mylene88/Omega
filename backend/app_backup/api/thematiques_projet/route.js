// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic';

// backend/app_backup/api/thematiques_projet/route.js

/*import { NextResponse } from 'next/server';
import { principale } from '@/backend/models';

const { ProjetGeometry, ProjetGeometryCommune, GeomCommune } = principale;

// GET toutes les géométries
export async function GET(request, contextPromise) {
  await contextPromise; // obligatoire pour Next.js 15 même si non utilisé
  try {
    const geometries = await ProjetGeometry.findAll({
      include: [
        {
          model: ProjetGeometryCommune,
          include: [{ model: GeomCommune, attributes: ['id', 'nom_com', 'code_insee'] }]
        }
      ]
    });
    return NextResponse.json(geometries, { status: 200 });
  } catch (error) {
    console.error('Erreur GET /api/projet-geometry:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST → Ajouter une nouvelle géométrie pour un projet
export async function POST(req, contextPromise) {
  await contextPromise; // obligatoire pour Next.js 15 même si non utilisé
  try {
    const { id_projet, geom, geom_type, communes_traversees, area_m2, length_m } = await req.json();

    const projetGeom = await ProjetGeometry.create({
      id_projet,
      geom,
      geom_type,
      area_m2,
      length_m,
      communes_traversees: communes_traversees.map(c => c.nom_com),
      codes_insee: communes_traversees.map(c => c.code_insee),
      epci: communes_traversees.map(c => c.code_epci),
      arrondissements: communes_traversees.map(c => c.arrondisst),
      deputes: communes_traversees.map(c => `${c.depute_prenom} ${c.depute_nom}`),
      maires: communes_traversees.map(c => `${c.maire_prenom} ${c.maire_nom}`)
    });

    for (const commune of communes_traversees) {
      await ProjetGeometryCommune.create({
        id_geom: projetGeom.id_geom,
        id_projet,
        id_commune: commune.id
      });
    }

    return NextResponse.json({ message: 'Géométrie ajoutée', id_geom: projetGeom.id_geom }, { status: 201 });
  } catch (error) {
    console.error('Erreur POST /api/projet-geometry:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}*/