// backend/app/api/admin/restore/route.js

import { NextResponse } from 'next/server';
import { logAudit, createSnapshot } from '@/backend/lib/auditHelper';
import db from '@/backend/models';

/**
 * Middleware pour vérifier que l'utilisateur est admin
 */
function checkAdminAccess(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isAdmin: false, userId: null };
  }
  return { isAdmin: true, userId: null };
}

/**
 * POST /api/admin/restore
 * Restaure un projet à partir d'un snapshot
 *
 * Body:
 * - snapshotId: ID du snapshot à restaurer (requis)
 * - createBackup: créer un backup avant restauration (défaut: true)
 */
export async function POST(request) {
  const transaction = await db.sequelize.transaction();

  try {
    // Vérifier l'accès admin
    const { isAdmin, userId } = checkAdminAccess(request);
    if (!isAdmin) {
      await transaction.rollback();
      return NextResponse.json({
        success: false,
        message: 'Accès non autorisé. Authentification admin requise.'
      }, { status: 403 });
    }

    const body = await request.json();
    const { snapshotId, createBackup = true } = body;

    if (!snapshotId) {
      await transaction.rollback();
      return NextResponse.json({
        success: false,
        message: 'snapshotId est requis'
      }, { status: 400 });
    }

    // Récupérer le snapshot
    const snapshot = await db.ProjetSnapshot.findByPk(snapshotId);

    if (!snapshot) {
      await transaction.rollback();
      return NextResponse.json({
        success: false,
        message: 'Snapshot non trouvé'
      }, { status: 404 });
    }

    const idProjet = snapshot.id_projet;
    const snapshotData = snapshot.snapshot_data;

    // Vérifier que le projet existe
    const projetExistant = await db.Projet.findByPk(idProjet);

    if (!projetExistant) {
      await transaction.rollback();
      return NextResponse.json({
        success: false,
        message: 'Le projet à restaurer n\'existe plus. Utilisez l\'endpoint de création pour recréer le projet.'
      }, { status: 404 });
    }

    // Créer un backup de l'état actuel avant restauration
    if (createBackup) {
      const currentProjet = await db.Projet.findByPk(idProjet, {
        include: [
          { model: db.ProjetPorteur, as: 'porteurs' },
          { model: db.ProjetSuivi, as: 'suivis' },
          { model: db.Document, as: 'documents' },
          { model: db.ProjetGeometry, as: 'geometry' },
          { model: db.ProjetInThematique, as: 'projet_in_thematiques' }
        ],
        transaction
      });

      await createSnapshot({
        idProjet,
        projetData: currentProjet.toJSON(),
        snapshotType: 'AUTO',
        description: `Backup automatique avant restauration du snapshot #${snapshotId}`,
        userId,
        transaction
      });
    }

    // 1. Mettre à jour les informations de base du projet
    await projetExistant.update({
      nom_projet: snapshotData.nom_projet,
      description: snapshotData.description,
      statut_projet_id: snapshotData.statut_projet_id,
      date_ident_projet: snapshotData.date_ident_projet,
      projet_signale: snapshotData.projet_signale,
      charte_accueil: snapshotData.charte_accueil,
      service_id: snapshotData.service_id,
      referent_ddt: snapshotData.referent_ddt,
      updated_by: userId,
      updated_at: new Date()
    }, { transaction });

    // 2. Restaurer les porteurs
    await db.ProjetPorteur.destroy({ where: { id_projet: idProjet }, transaction });
    if (snapshotData.porteurs && snapshotData.porteurs.length > 0) {
      const porteursData = snapshotData.porteurs.map(p => ({
        id_projet: idProjet,
        type_porteur_id: p.type_porteur_id,
        autre_type_porteur: p.autre_type_porteur,
        nom_structure: p.nom_structure,
        referent_nom: p.referent_nom,
        referent_fonction: p.referent_fonction,
        referent_email: p.referent_email,
        referent_tel: p.referent_tel
      }));
      await db.ProjetPorteur.bulkCreate(porteursData, { transaction });
    }

    // 3. Restaurer les suivis (NE PAS supprimer les anciens, juste restaurer ceux du snapshot)
    if (snapshotData.suivis && snapshotData.suivis.length > 0) {
      const suivisData = snapshotData.suivis.map(s => ({
        id_projet: idProjet,
        suivi: s.suivi,
        created_by: s.created_by,
        created_at: s.created_at
      }));
      await db.ProjetSuivi.bulkCreate(suivisData, { transaction });
    }

    // 4. Restaurer les documents
    await db.Document.destroy({ where: { id_projet: idProjet }, transaction });
    if (snapshotData.documents && snapshotData.documents.length > 0) {
      const documentsData = snapshotData.documents.map(d => ({
        id_projet: idProjet,
        lien_local: d.lien_local,
        lien_web: d.lien_web
      }));
      await db.Document.bulkCreate(documentsData, { transaction });
    }

    // 5. Restaurer les thématiques
    await db.ProjetInThematique.destroy({ where: { id_projet: idProjet }, transaction });
    if (snapshotData.projet_in_thematiques && snapshotData.projet_in_thematiques.length > 0) {
      const thematiqueData = snapshotData.projet_in_thematiques.map(t => ({
        id_projet: idProjet,
        id_thematique: t.id_thematique,
        ajoute_par: t.ajoute_par,
        date_ajout: t.date_ajout
      }));
      await db.ProjetInThematique.bulkCreate(thematiqueData, { transaction });
    }

    // 6. Restaurer la géométrie
    await db.ProjetGeometry.destroy({ where: { id_projet: idProjet }, transaction });
    if (snapshotData.geometry) {
      const geomData = {
        id_projet: idProjet,
        geom_type: snapshotData.geometry.geom_type,
        geom: snapshotData.geometry.geom,
        area_m2: snapshotData.geometry.area_m2,
        length_m: snapshotData.geometry.length_m,
        communes_traversees: snapshotData.geometry.communes_traversees,
        codes_insee: snapshotData.geometry.codes_insee,
        epci: snapshotData.geometry.epci,
        arrondissements: snapshotData.geometry.arrondissements,
        deputes: snapshotData.geometry.deputes,
        maires: snapshotData.geometry.maires
      };
      await db.ProjetGeometry.create(geomData, { transaction });
    }

    // Enregistrer l'action de restauration dans l'audit log
    await logAudit({
      tableName: 'projet',
      recordId: idProjet,
      action: 'RESTORE',
      oldValues: null,
      newValues: { snapshot_id: snapshotId, snapshot_date: snapshot.created_at },
      userId,
      userIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
      transaction
    });

    await transaction.commit();

    return NextResponse.json({
      success: true,
      message: 'Projet restauré avec succès',
      data: {
        idProjet,
        snapshotId,
        snapshotDate: snapshot.created_at,
        restoredAt: new Date().toISOString()
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Erreur POST /api/admin/restore:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la restauration du projet',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

/**
 * OPTIONS pour CORS
 */
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
