// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic';

// app/api/porteur/route.js

import { NextResponse } from 'next/server';
import db from '@/backend/models';
import { saveCurrentSectionVersion, extractUserId } from '@/backend/lib/sectionVersionHelper';

const { ProjetPorteur, TypePorteurEnum, Projet } = db;

export async function GET(request) {  // ✅ Enlevé contextPromise
  try {
    const porteurs = await ProjetPorteur.findAll({
      include: [{ 
        model: TypePorteurEnum, 
        attributes: ['id_type_porteur', 'libelle'] 
      }],
    });

    return NextResponse.json(porteurs, { status: 200 });
  } catch (error) {
    console.error('Erreur GET /api/porteur:', error);
    return NextResponse.json({ 
      error: 'Impossible de récupérer les porteurs' 
    }, { status: 500 });
  }
}

export async function POST(request) {
  const transaction = await db.sequelize.transaction();

  try {
    const data = await request.json();
    const userId = extractUserId(request, data);

    const projet = await Projet.findByPk(data.id_projet, { transaction });
    if (!projet) {
      await transaction.rollback();
      return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 });
    }

    const type = await TypePorteurEnum.findByPk(data.type_porteur_id, { transaction });
    if (!type) {
      await transaction.rollback();
      return NextResponse.json({ error: 'Type porteur invalide' }, { status: 400 });
    }

    // 📸 Sauvegarder la version actuelle avant ajout
    if (userId && data.id_projet) {
      await saveCurrentSectionVersion({
        idProjet: data.id_projet,
        userId,
        sectionName: 'porteurs',
        description: 'Ajout d\'un nouveau porteur',
        transaction
      });
    }

    const porteur = await ProjetPorteur.create({
      id_projet: data.id_projet,
      type_porteur_id: data.type_porteur_id,
      nom_structure: data.nom_structure,
      autre_type_porteur: data.autre_type_porteur || null,
      referent_nom: data.referent_nom || null,
      referent_fonction: data.referent_fonction || null,
      referent_email: data.referent_email || null,
      referent_tel: data.referent_tel || null,
    }, { transaction });

    console.log('le porteur de ce projet est :', porteur);

    const porteurWithType = await ProjetPorteur.findByPk(porteur.id_porteur, {
      include: [{ model: TypePorteurEnum, attributes: ['libelle'] }],
      transaction
    });

    await transaction.commit();

    return NextResponse.json(porteurWithType, { status: 201 });
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur POST /api/projet-porteur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
