// Force dynamic rendering (no static generation at build time)

// backend/app/api/thematiques_projet/[id]/route.js

/*import { principale } from '@/models';

const { ProjetGeometry, ProjetGeometryCommune, GeomCommune } = principale;

// GET → une géométrie spécifique


// PUT → mise à jour d'une géométrie


// DELETE → supprimer une géométrie

*/
export default async function handler(req, res) {
  if (req.method === 'GET') {

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
    if (!projetGeom) return res.status(404 ).json({ error: 'Géométrie non trouvée' });
    return res.status(200 ).json(projetGeom);
  } catch (error) {
    console.error(`Erreur GET /api/projet-geometry/${context.params?.id}:`, error);
    return res.status(500 ).json({ error: 'Erreur serveur' });
  }
  }
  else if (req.method === 'PUT') {

  try {
    const context = await contextPromise;
    const { params } = context;
    const { geom, geom_type, communes_traversees, area_m2, length_m } = req.body;
    const projetGeom = await ProjetGeometry.findByPk(params.id);
    if (!projetGeom) return res.status(404 ).json({ error: 'Géométrie non trouvée' });

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

    return res.status(200 ).json({ message: 'Géométrie mise à jour' });
  } catch (error) {
    console.error('Erreur PUT /api/projet-geometry/[id]:', error);
    return res.status(500 ).json({ error: 'Erreur serveur' });
  }
  }
  else if (req.method === 'DELETE') {

  try {
    const context = await contextPromise;
    const { params } = context;
    const projetGeom = await ProjetGeometry.findByPk(params.id);
    if (!projetGeom) return res.status(404 ).json({ error: 'Géométrie non trouvée' });

    await projetGeom.destroy();
    return res.status(200 ).json({ message: 'Géométrie supprimée' });
  } catch (error) {
    console.error('Erreur DELETE /api/projet-geometry/[id]:', error);
    return res.status(500 ).json({ error: 'Erreur serveur' });
  }
  }
  else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}
