// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic';

//backend/app_backup/api/porteurs/[id]/route.js
import { NextResponse } from 'next/server';
import db from '@/backend/models';
import { saveCurrentSectionVersion, extractUserId } from '@/backend/lib/sectionVersionHelper';

const { ProjetPorteur, TypePorteurEnum, Projet } = db;
// GET /api/porteur/[id]
export async function GET(_req, contextPromise) {
  const { params } = await contextPromise; // Attend le contexte
  try {
    const porteur = await ProjetPorteur.findByPk(params.id, {
      include: [{ model: TypePorteurEnum, attributes: ['id_type_porteur', 'libelle'] }],
    });
    if (!porteur) {
      return NextResponse.json({ error: 'Porteur non trouvé' }, { status: 404 });
    }
    return NextResponse.json(porteur, { status: 200 });
  } catch (error) {
    console.error(`Erreur GET /api/porteur/${params.id}:`, error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/porteur/[id]
export async function PUT(_req, contextPromise) {
  const { params } = await contextPromise; // Attend le contexte
  const transaction = await db.sequelize.transaction();

  try {
    const data = await _req.json();
    const userId = extractUserId(_req, data);

    const porteur = await ProjetPorteur.findByPk(params.id, { transaction });
    if (!porteur) {
      await transaction.rollback();
      return NextResponse.json({ error: 'Porteur non trouvé' }, { status: 404 });
    }

    if (data.type_porteur_id) {
      const type = await TypePorteurEnum.findByPk(data.type_porteur_id, { transaction });
      if (!type) {
        await transaction.rollback();
        return NextResponse.json({ error: 'Type de porteur invalide' }, { status: 400 });
      }
    }

    // 📸 Sauvegarder la version actuelle avant modification
    if (userId && porteur.id_projet) {
      await saveCurrentSectionVersion({
        idProjet: porteur.id_projet,
        userId,
        sectionName: 'porteurs',
        description: `Modification du porteur #${params.id}`,
        transaction
      });
    }

    await porteur.update(data, { transaction });
    await transaction.commit();

    return NextResponse.json(porteur, { status: 200 });
  } catch (error) {
    await transaction.rollback();
    console.error(`Erreur PUT /api/porteur/${params.id}:`, error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/porteur/[id]
export async function DELETE(_req, contextPromise) {
  const { params } = await contextPromise; // Attend le contexte
  const transaction = await db.sequelize.transaction();

  try {
    const url = new URL(_req.url);
    const userId = parseInt(url.searchParams.get('userId'), 10) || null;

    const porteur = await ProjetPorteur.findByPk(params.id, { transaction });
    if (!porteur) {
      await transaction.rollback();
      return NextResponse.json({ error: 'Porteur non trouvé' }, { status: 404 });
    }

    // 📸 Sauvegarder la version actuelle avant suppression
    if (userId && porteur.id_projet) {
      await saveCurrentSectionVersion({
        idProjet: porteur.id_projet,
        userId,
        sectionName: 'porteurs',
        description: `Suppression du porteur #${params.id}`,
        transaction
      });
    }

    await porteur.destroy({ transaction });
    await transaction.commit();

    return NextResponse.json({ message: 'Porteur supprimé' }, { status: 200 });
  } catch (error) {
    await transaction.rollback();
    console.error(`Erreur DELETE /api/porteur/${params.id}:`, error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
