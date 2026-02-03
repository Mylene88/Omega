// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic';

//backend/app_backup/api/suivi/[id]/route.js

import { NextResponse } from 'next/server';
import db from '@/backend/models';
import { saveCurrentSectionVersion, extractUserId } from '@/backend/lib/sectionVersionHelper';

const { ProjetSuivi, User } = db;

// GET /api/suivi/[id]
export async function GET(request, { params }) {  // ✅ Changé
  try {
    const { id } = params;  // ✅ Accès direct

    const suivi = await ProjetSuivi.findByPk(id, {
      include: [{
        model: User,
        as: 'auteur',  // ✅ Vérifiez l'alias
        attributes: ['id_user', 'username']
      }],
    });

    if (!suivi) {
      return NextResponse.json({ error: 'Suivi non trouvé' }, { status: 404 });
    }

    return NextResponse.json({
      id_suivi: suivi.id_suivi,
      projet_id: suivi.id_projet,
      suivi: suivi.suivi,
      created_at: suivi.created_at,
      created_by: suivi.auteur?.username || null,
    }, { status: 200 });
  } catch (error) {
    console.error(`Erreur GET /api/suivi/${params?.id}:`, error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/suivi/[id]
export async function PUT(request, { params }) {
  const transaction = await db.sequelize.transaction();

  try {
    const { id } = params;
    const data = await request.json();
    const userId = extractUserId(request, data);

    const suivi = await ProjetSuivi.findByPk(id, { transaction });

    if (!suivi) {
      await transaction.rollback();
      return NextResponse.json({ error: 'Suivi non trouvé' }, { status: 404 });
    }

    // 📸 Sauvegarder la version actuelle avant modification
    if (userId && suivi.id_projet) {
      await saveCurrentSectionVersion({
        idProjet: suivi.id_projet,
        userId,
        sectionName: 'suivis',
        description: `Modification du suivi #${id}`,
        transaction
      });
    }

    await suivi.update({
      suivi: data.suivi ?? suivi.suivi,
    }, { transaction });

    const user = await User.findByPk(suivi.created_by, { transaction });

    await transaction.commit();

    return NextResponse.json({
      id_suivi: suivi.id_suivi,
      projet_id: suivi.id_projet,
      suivi: suivi.suivi,
      created_at: suivi.created_at,
      created_by: user?.username || null,
    }, { status: 200 });
  } catch (error) {
    await transaction.rollback();
    console.error(`Erreur PUT /api/suivi/${params?.id}:`, error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/suivi/[id]
export async function DELETE(request, { params }) {
  const transaction = await db.sequelize.transaction();

  try {
    const { id } = params;
    const url = new URL(request.url);
    const userId = parseInt(url.searchParams.get('userId'), 10) || null;

    const suivi = await ProjetSuivi.findByPk(id, { transaction });

    if (!suivi) {
      await transaction.rollback();
      return NextResponse.json({ error: 'Suivi non trouvé' }, { status: 404 });
    }

    // 📸 Sauvegarder la version actuelle avant suppression
    if (userId && suivi.id_projet) {
      await saveCurrentSectionVersion({
        idProjet: suivi.id_projet,
        userId,
        sectionName: 'suivis',
        description: `Suppression du suivi #${id}`,
        transaction
      });
    }

    await suivi.destroy({ transaction });

    await transaction.commit();

    return NextResponse.json({ message: 'Suivi supprimé' }, { status: 200 });
  } catch (error) {
    await transaction.rollback();
    console.error(`Erreur DELETE /api/suivi/${params?.id}:`, error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
