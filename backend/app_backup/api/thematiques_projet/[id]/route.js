// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic';

// backend/app_backup/api/thematiques_projet/[id]/route.js

/*import { NextResponse } from 'next/server';
import { principale } from '@/models';

const { ProjetGeometry, ProjetGeometryCommune, GeomCommune } = principale;

// GET → une géométrie spécifique
export async function GET(_req, contextPromise) {
  try {
    const context = await contextPromise;
    const { params } = context;
    const projetGeom = await ProjetGeometry.findByPk(params.id, {
      include: [
        {
          model: ProjetGeometryCommune,
          include: [{ model: GeomCommune, attributes: ['id', 'nom_com', 'code_insee'] }]
        }
      ]
    });
    if (!projetGeom) return NextResponse.json({ error: 'Géométrie non trouvée' }, { status: 404 });
    return NextResponse.json(projetGeom, { status: 200 });
  } catch (error) {
    console.error(`Erreur GET /api/projet-geometry/${context.params?.id}:`, error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT → mise à jour d'une géométrie
export async function PUT(req, contextPromise) {
  try {
    const context = await contextPromise;
    const { params } = context;
    const { geom, geom_type, communes_traversees, area_m2, length_m } = await req.json();
    const projetGeom = await ProjetGeometry.findByPk(params.id);
    if (!projetGeom) return NextResponse.json({ error: 'Géométrie non trouvée' }, { status: 404 });

    await projetGeom.update({
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

    await ProjetGeometryCommune.destroy({ where: { id_geom: projetGeom.id_geom } });

    for (const commune of communes_traversees) {
      await ProjetGeometryCommune.create({
        id_geom: projetGeom.id_geom,
        id_projet: projetGeom.id_projet,
        id_commune: commune.id
      });
    }

    return NextResponse.json({ message: 'Géométrie mise à jour' }, { status: 200 });
  } catch (error) {
    console.error('Erreur PUT /api/projet-geometry/[id]:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE → supprimer une géométrie
export async function DELETE(_req, contextPromise) {
  try {
    const context = await contextPromise;
    const { params } = context;
    const projetGeom = await ProjetGeometry.findByPk(params.id);
    if (!projetGeom) return NextResponse.json({ error: 'Géométrie non trouvée' }, { status: 404 });

    await projetGeom.destroy();
    return NextResponse.json({ message: 'Géométrie supprimée' }, { status: 200 });
  } catch (error) {
    console.error('Erreur DELETE /api/projet-geometry/[id]:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
*/