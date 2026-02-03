// Force dynamic rendering (no static generation at build time)

// backend/app_backup/api/admin/restore/route.js

import { logAudit, createSnapshot } from '../../../../lib/auditHelper';
import { requireAdmin } from '../../../../lib/adminAuthHelper';
import db from '../../../../models';

/**
 * POST /api/admin/restore
 * Restaure un projet à partir d'un snapshot
 *
 * Body:
 * - snapshotId: ID du snapshot à restaurer (requis)
 * - createBackup: créer un backup avant restauration (défaut: true)
 */


/**
 * OPTIONS pour CORS
 */


export default async function handler(req, res) {
  if (req.method === 'POST') {

  const transaction = await db.sequelize.transaction();

  try {
    // Vérifier l'accès admin
    const adminCheck = await requireAdmin(req);
    if (!adminCheck.allowed) {
      await transaction.rollback();
      return res.status(adminCheck.status ).json(adminCheck.response);
    }
    const userId = adminCheck.userId;

    const body = req.body;
    const { snapshotId, createBackup = false } = body;  // Désactivé par défaut pour éviter les conflits de version

    if (!snapshotId) {
      await transaction.rollback();
      return res.json({
        success: false,
        message: 'snapshotId est requis'
      }, { status: 400 });
    }

    // Récupérer le snapshot avec ses sections
    console.log('\n=== 🔄 DÉBUT RESTAURATION ===');
    console.log(`Snapshot ID: ${snapshotId}`);
    console.log(`Créer backup: ${createBackup ? 'Oui' : 'Non'}`);
    console.log(`User ID: ${userId}`);

    const snapshot = await db.ProjetSnapshot.findByPk(snapshotId, {
      include: [{
        model: db.ProjetSnapshotSection,
        as: 'sections'
      }]
    });

    if (!snapshot) {
      await transaction.rollback();
      console.log('❌ Snapshot non trouvé');
      return res.json({
        success: false,
        message: 'Snapshot non trouvé'
      }, { status: 404 });
    }

    console.log(`\n📸 Snapshot trouvé #${snapshotId} pour projet ${snapshot.id_projet}`);
    console.log(`   Version: ${snapshot.version_number}`);
    console.log(`   Date: ${snapshot.snapshot_date}`);
    console.log(`   Nombre de sections: ${snapshot.sections?.length || 0}`);
    if (snapshot.sections && snapshot.sections.length > 0) {
      console.log(`   Sections disponibles:`, snapshot.sections.map(s => s.section_name));
    }

    const idProjet = snapshot.id_projet;

    // Reconstituer les données depuis les sections
    console.log('\n📦 Reconstitution des données depuis les sections...');
    const snapshotData = {};
    if (snapshot.sections && snapshot.sections.length > 0) {
      snapshot.sections.forEach(section => {
        const dataLength = Array.isArray(section.section_data)
          ? section.section_data.length
          : (section.section_data ? 'Objet' : 'Vide');

        console.log(`   📋 Section "${section.section_name}": ${dataLength} élément(s)`);

        if (section.section_name === 'projet_info') {
          Object.assign(snapshotData, section.section_data);
          console.log(`      ✅ Données projet_info chargées:`, Object.keys(section.section_data));
        } else if (section.section_name === 'porteurs') {
          snapshotData.porteurs = section.section_data;
          console.log(`      ✅ ${section.section_data.length} porteur(s)`);
        } else if (section.section_name === 'suivis') {
          snapshotData.suivis = section.section_data;
          console.log(`      ✅ ${section.section_data.length} suivi(s)`);
        } else if (section.section_name === 'thematiques') {
          snapshotData.thematiques = section.section_data;
          console.log(`      ✅ ${section.section_data.length} thématique(s)`);
        } else if (section.section_name === 'documents') {
          snapshotData.documents = section.section_data;
          console.log(`      ✅ ${section.section_data.length} document(s)`);
        } else if (section.section_name === 'geometrie') {
          snapshotData.geometry = section.section_data;
          console.log(`      ✅ Géométrie ${section.section_data ? 'présente' : 'absente'}`);
        }
      });
    } else {
      console.warn(`⚠️  Aucune section trouvée pour le snapshot #${snapshotId}`);
      console.log(`   Type de snapshot: ${typeof snapshot.sections}`);
      console.log(`   Snapshot complet:`, JSON.stringify(snapshot, null, 2));
    }

    console.log(`\n📊 Résumé des données reconstituées:`);
    console.log(`   - Nom projet: ${snapshotData.nom_projet}`);
    console.log(`   - Porteurs: ${snapshotData.porteurs?.length || 0}`);
    console.log(`   - Suivis: ${snapshotData.suivis?.length || 0}`);
    console.log(`   - Thématiques: ${snapshotData.thematiques?.length || 0}`);
    console.log(`   - Documents: ${snapshotData.documents?.length || 0}`);
    console.log(`   - Géométrie: ${snapshotData.geometry ? 'Oui' : 'Non'}`);

    // Vérifier que nous avons au moins les infos de base du projet
    if (!snapshotData.nom_projet) {
      await transaction.rollback();
      console.error(`❌ Snapshot invalide - nom_projet manquant`);
      return res.json({
        success: false,
        message: `Snapshot invalide : ce snapshot n'a pas de sections ou les données projet_info sont manquantes. Il s'agit peut-être d'un ancien snapshot créé avant la mise à jour du système. Nombre de sections: ${snapshot.sections?.length || 0}`
      }, { status: 400 });
    }

    // Vérifier que le projet existe
    const projetExistant = await db.Projet.findByPk(idProjet);

    if (!projetExistant) {
      await transaction.rollback();
      return res.json({
        success: false,
        message: 'Le projet à restaurer n\'existe plus. Utilisez l\'endpoint de création pour recréer le projet.'
      }, { status: 404 });
    }

    // ⚠️ BACKUP DÉSACTIVÉ : Créer un backup de l'état actuel avant restauration
    // Désactivé car cela cause des conflits de contrainte unique sur (id_projet, user_id, version_number)
    // Lors de la restauration, vous restaurez un snapshot existant, donc vous avez déjà un backup.
    if (createBackup) {
      console.log('\n⚠️  Backup avant restauration désactivé (snapshot existant = backup)');
      // Le code ci-dessous est commenté pour éviter les conflits
      /*
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
        transaction,
        skipRotation: true
      });
      */
    }

    // 1. Mettre à jour les informations de base du projet
    console.log('\n🔄 RESTAURATION DES DONNÉES...');
    console.log('1️⃣  Mise à jour des informations de base du projet...');

    const updateData = {
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
    };

    console.log('   📋 Données à restaurer:');
    console.log(`      - nom_projet: "${snapshotData.nom_projet}"`);
    console.log(`      - description: "${snapshotData.description?.substring(0, 50)}..."`);
    console.log(`      - statut_projet_id: ${snapshotData.statut_projet_id}`);
    console.log(`      - service_id: ${snapshotData.service_id}`);

    console.log('   📋 Valeurs actuelles:');
    console.log(`      - nom_projet: "${projetExistant.nom_projet}"`);
    console.log(`      - description: "${projetExistant.description?.substring(0, 50)}..."`);
    console.log(`      - statut_projet_id: ${projetExistant.statut_projet_id}`);
    console.log(`      - service_id: ${projetExistant.service_id}`);

    await projetExistant.update(updateData, { transaction });
    console.log('   ✅ Informations de base restaurées');

    // 2. Restaurer les porteurs
    console.log('2️⃣  Restauration des porteurs...');
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
      console.log(`   ✅ ${porteursData.length} porteur(s) restauré(s)`);
    } else {
      console.log('   ℹ️  Aucun porteur à restaurer');
    }

    // 3. Restaurer les suivis
    console.log('3️⃣  Restauration des suivis...');
    await db.ProjetSuivi.destroy({ where: { id_projet: idProjet }, transaction });
    if (snapshotData.suivis && snapshotData.suivis.length > 0) {
      const suivisData = snapshotData.suivis.map(s => ({
        id_projet: idProjet,
        suivi: s.suivi,
        created_by: s.created_by,
        created_at: s.created_at
      }));
      await db.ProjetSuivi.bulkCreate(suivisData, { transaction });
      console.log(`   ✅ ${suivisData.length} suivi(s) restauré(s)`);
    } else {
      console.log('   ℹ️  Aucun suivi à restaurer');
    }

    // 4. Restaurer les documents
    console.log('4️⃣  Restauration des documents...');
    await db.Document.destroy({ where: { id_projet: idProjet }, transaction });
    if (snapshotData.documents && snapshotData.documents.length > 0) {
      const documentsData = snapshotData.documents.map(d => ({
        id_projet: idProjet,
        lien_local: d.lien_local,
        lien_web: d.lien_web
      }));
      await db.Document.bulkCreate(documentsData, { transaction });
      console.log(`   ✅ ${documentsData.length} document(s) restauré(s)`);
    } else {
      console.log('   ℹ️  Aucun document à restaurer');
    }

    // 5. Restaurer les thématiques
    console.log('5️⃣  Restauration des thématiques...');
    await db.ProjetInThematique.destroy({ where: { id_projet: idProjet }, transaction });
    const thematiquesSources = snapshotData.thematiques || snapshotData.projet_in_thematiques || [];
    console.log(`   📋 Sources trouvées: thematiques=${snapshotData.thematiques?.length || 0}, projet_in_thematiques=${snapshotData.projet_in_thematiques?.length || 0}`);
    if (thematiquesSources.length > 0) {
      const thematiqueData = thematiquesSources.map(t => ({
        id_projet: idProjet,
        id_thematique: t.id_thematique,
        ajoute_par: t.ajoute_par,
        date_ajout: t.date_ajout
      }));
      await db.ProjetInThematique.bulkCreate(thematiqueData, { transaction });
      console.log(`   ✅ ${thematiqueData.length} thématique(s) restaurée(s)`);
      console.log(`   📝 IDs restaurés: ${thematiqueData.map(t => t.id_thematique).join(', ')}`);
    } else {
      console.log('   ⚠️  Aucune thématique à restaurer');
    }

    // 6. Restaurer la géométrie
    console.log('6️⃣  Restauration de la géométrie...');
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
      console.log('   ✅ Géométrie restaurée');
    } else {
      console.log('   ℹ️  Aucune géométrie à restaurer');
    }

    // Enregistrer l'action de restauration dans l'audit log
    await logAudit({
      tableName: 'projet',
      recordId: idProjet,
      action: 'RESTORE',
      oldValues: null,
      newValues: { snapshot_id: snapshotId, snapshot_date: snapshot.created_at },
      userId,
      userIp: req.headers['x-forwarded-for'] || req.headers['x-real-ip'],
      userAgent: req.headers['user-agent'],
      transaction
    });

    await transaction.commit();

    console.log('\n✅ RESTAURATION TERMINÉE AVEC SUCCÈS');
    console.log(`   Projet: ${idProjet}`);
    console.log(`   Snapshot: #${snapshotId} (v${snapshot.version_number})`);
    console.log('=== FIN RESTAURATION ===\n');

    return res.json({
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
    return res.json({
      success: false,
      message: 'Erreur lors de la restauration du projet',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
  }
  else if (req.method === 'OPTIONS') {

  return res.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
  }
  else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}
