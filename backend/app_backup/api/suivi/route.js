// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic';

//backend/app_backup/api/suivi/route.js

import { NextResponse } from 'next/server';
import db from '@/backend/models';
import { saveCurrentSectionVersion, extractUserId } from '@/backend/lib/sectionVersionHelper';

const { ProjetSuivi, User, Projet } = db;

// GET /api/suivi
export async function GET(request) {  // ✅ Enlevé contextPromise
  try {
    const suivis = await ProjetSuivi.findAll({
      include: [
        { model: User, as: 'auteur', attributes: ['id_user', 'username'] },
        { model: Projet, attributes: ['id_projet', 'nom_projet'] },
      ],
      order: [['created_at', 'DESC']],
    });

    const result = suivis.map(s => ({
      id_suivi: s.id_suivi,
      projet_id: s.id_projet,
      projet_nom: s.projet?.nom_projet,
      suivi: s.suivi,
      created_at: s.created_at,
      created_by: s.auteur?.username || null,
    }));

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Erreur GET /api/suivi:', error);
    return NextResponse.json({ error: 'Impossible de récupérer les suivis' }, { status: 500 });
  }
}

// POST /api/suivi
export async function POST(request) {
  const transaction = await db.sequelize.transaction();

  try {
    const data = await request.json();
    const userId = extractUserId(request, data) || data.created_by;

    const projet = await Projet.findByPk(data.id_projet, { transaction });
    if (!projet) {
      await transaction.rollback();
      return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 });
    }

    const user = await User.findByPk(data.created_by, { transaction });
    if (!user) {
      await transaction.rollback();
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // 📸 Sauvegarder la version actuelle avant ajout
    if (userId && data.id_projet) {
      await saveCurrentSectionVersion({
        idProjet: data.id_projet,
        userId,
        sectionName: 'suivis',
        description: 'Ajout d\'un nouveau suivi',
        transaction
      });
    }

    const suivi = await ProjetSuivi.create({
      id_projet: data.id_projet,
      suivi: data.suivi,
      created_by: data.created_by,
    }, { transaction });

    await transaction.commit();

    return NextResponse.json({
      id_suivi: suivi.id_suivi,
      projet_id: suivi.id_projet,
      suivi: suivi.suivi,
      created_at: suivi.created_at,
      created_by: user.username,
    }, { status: 201 });
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur POST /api/suivi:', error);
    return NextResponse.json({ error: 'Impossible de créer le suivi' }, { status: 500 });
  }
}
