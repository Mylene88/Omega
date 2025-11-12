// backend/app/api/admin/restore/route.js

import { NextResponse } from 'next/server';
import { logAudit, createSnapshot } from '@/backend/lib/auditHelper';
import { requireAdmin } from '@/backend/lib/adminAuthHelper';
import db from '@/backend/models';

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
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.allowed) {
      await transaction.rollback();
      return NextResponse.json(adminCheck.response, { status: adminCheck.status });
    }
    const userId = adminCheck.userId;

    const body = await request.json();
    const { snapshotId, createBackup = true } = body;

    if (!snapshotId) {
      await transaction.rollback();
      return NextResponse.json({
        success: false,
        message: 'snapshotId est requis'
      }, { status: 400 });
    }

    // Récupérer le snapshot avec ses sections
    const snapshot = await db.ProjetSnapshot.findByPk(snapshotId, {
      include: [{
        model: db.ProjetSnapshotSection,
        as: 'sections'
      }]
    });

    if (!snapshot) {
      await transaction.rollback();
      return NextResponse.json({
        success: false,
        message: 'Snapshot non trouvé'
      }, { status: 404 });
    }

    console.log(`📸 Snapshot trouvé #${snapshotId} pour projet ${snapshot.id_projet}`);
    console.log(`   Nombre de sections: ${snapshot.sections?.length || 0}`);
    if (snapshot.sections && snapshot.sections.length > 0) {
      console.log(`   Sections disponibles:`, snapshot.sections.map(s => s.section_name));
    }

    const idProjet = snapshot.id_projet;

    // Reconstituer les données depuis les sections
    const snapshotData = {};
    if (snapshot.sections && snapshot.sections.length > 0) {
      snapshot.sections.forEach(section => {
        console.log(`   📋 Traitement section: ${section.section_name}`);
        if (section.section_name === 'projet_info') {
          Object.assign(snapshotData, section.section_data);
          console.log(`      ✅ Données projet_info chargées:`, Object.keys(section.section_data));
        } else if (section.section_name === 'porteurs') {
          snapshotData.porteurs = section.section_data;
        } else if (section.section_name === 'suivis') {
          snapshotData.suivis = section.section_data;
        } else if (section.section_name === 'thematiques') {
          snapshotData.thematiques = section.section_data;
        } else if (section.section_name === 'documents') {
          snapshotData.documents = section.section_data;
        } else if (section.section_name === 'geometrie') {
          snapshotData.geometry = section.section_data;
        }
      });
    } else {
      console.warn(`⚠️  Aucune section trouvée pour le snapshot #${snapshotId}`);
      console.log(`   Type de snapshot: ${typeof snapshot.sections}`);
      console.log(`   Snapshot complet:`, JSON.stringify(snapshot, null, 2));
    }

    console.log(`📊 Données reconstituées:`, {
      nom_projet: snapshotData.nom_projet,
      hasPorteurs: !!snapshotData.porteurs,
      hasSuivis: !!snapshotData.suivis,
      hasGeometry: !!snapshotData.geometry
    });

    // Vérifier que nous avons au moins les infos de base du projet
    if (!snapshotData.nom_projet) {
      await transaction.rollback();
      console.error(`❌ Snapshot invalide - nom_projet manquant`);
      return NextResponse.json({
        success: false,
        message: `Snapshot invalide : ce snapshot n'a pas de sections ou les données projet_info sont manquantes. Il s'agit peut-être d'un ancien snapshot créé avant la mise à jour du système. Nombre de sections: ${snapshot.sections?.length || 0}`
      }, { status: 400 });
    }

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
    const thematiquesSources = snapshotData.thematiques || snapshotData.projet_in_thematiques || [];
    if (thematiquesSources.length > 0) {
      const thematiqueData = thematiquesSources.map(t => ({
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
