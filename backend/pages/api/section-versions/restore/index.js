// Force dynamic rendering (no static generation at build time)

// backend/app/api/section-versions/restore/route.js
/**
 * API pour restaurer une version spécifique d'une section
 */

import { requireAdmin } from '../../../../lib/adminAuthHelper';
import db from '../../../../models';

/**
 * POST /api/section-versions/restore
 * Restaurer une version spécifique d'une section
 *
 * Body:
 * - idVersion: ID de la version à restaurer
 * - reason: raison de la restauration (optionnel)
 */


/**
 * OPTIONS pour CORS
 */


export default async function handler(req, res) {
  if (req.method === 'POST') {

  try {
    console.log('\n=== 🔄 RESTAURATION VERSION DE SECTION ===');

    // Vérifier les droits admin
    const adminCheck = await requireAdmin(req);
    if (!adminCheck.allowed) {
      console.log('❌ Droits admin requis');
      return res.status(adminCheck.status ).json(adminCheck.response);
    }
    const adminUserId = adminCheck.userId;
    console.log(`Admin User ID: ${adminUserId}`);

    const body = req.body;
    const { idVersion, reason } = body;

    console.log(`Version ID: ${idVersion}`);
    console.log(`Raison: ${reason || 'Aucune'}`);

    // Validation
    if (!idVersion) {
      console.log('❌ ID version manquant');
      return res.json({
        success: false,
        message: 'idVersion est requis'
      }, { status: 400 });
    }

    // Récupérer la version à restaurer
    console.log('🔍 Recherche de la version...');
    const version = await db.SectionVersion.findByPk(idVersion, {
      include: [
        {
          model: db.Projet,
          as: 'projet'
        }
      ]
    });

    if (!version) {
      console.log('❌ Version non trouvée');
      return res.json({
        success: false,
        message: 'Version non trouvée'
      }, { status: 404 });
    }

    const { id_projet, section_name, section_data } = version;
    console.log(`✅ Version trouvée:`);
    console.log(`   Projet: ${version.projet?.nom_projet} (ID: ${id_projet})`);
    console.log(`   Section: ${section_name}`);
    console.log(`   Version: ${version.version_number}`);
    console.log(`   Date: ${version.snapshot_date}`);

    // Démarrer une transaction pour garantir la cohérence
    console.log('\n🔒 Démarrage de la transaction...');
    const transaction = await db.sequelize.transaction();

    try {
      console.log(`\n🔄 Restauration de la section "${section_name}"...`);
      // Restaurer la section selon son type
      switch (section_name) {
        case 'projet_info':
          console.log('   📝 Restauration des informations du projet...');
          // Restaurer les informations du projet
          await db.Projet.update(
            {
              nom_projet: section_data.nom_projet,
              description: section_data.description,
              statut_id: section_data.statut_id,
              date_ident_projet: section_data.date_ident_projet,
              projet_signale: section_data.projet_signale,
              charte_accueil: section_data.charte_accueil,
              id_service_ddt: section_data.id_service_ddt,
              referent_ddt: section_data.referent_ddt,
              updated_by: adminUserId,
              updated_at: new Date()
            },
            {
              where: { id_projet },
              transaction
            }
          );
          console.log('   ✅ Informations du projet restaurées');
          break;

        case 'porteurs':
          console.log('   📝 Restauration des porteurs...');
          // Supprimer les porteurs actuels
          await db.ProjetPorteur.destroy({
            where: { id_projet },
            transaction
          });
          // Recréer les porteurs depuis la version
          if (Array.isArray(section_data.porteurs)) {
            for (const porteur of section_data.porteurs) {
              await db.ProjetPorteur.create({
                ...porteur,
                id_projet,
                created_by: adminUserId
              }, { transaction });
            }
            console.log(`   ✅ ${section_data.porteurs.length} porteur(s) restauré(s)`);
          } else {
            console.log('   ℹ️  Aucun porteur à restaurer');
          }
          break;

        case 'suivis':
          console.log('   📝 Restauration des suivis...');
          // Supprimer les suivis actuels
          await db.ProjetSuivi.destroy({
            where: { id_projet },
            transaction
          });
          // Recréer les suivis depuis la version
          if (Array.isArray(section_data.suivis)) {
            for (const suivi of section_data.suivis) {
              await db.ProjetSuivi.create({
                ...suivi,
                id_projet,
                created_by: adminUserId
              }, { transaction });
            }
            console.log(`   ✅ ${section_data.suivis.length} suivi(s) restauré(s)`);
          } else {
            console.log('   ℹ️  Aucun suivi à restaurer');
          }
          break;

        case 'thematiques':
          console.log('   📝 Restauration des thématiques...');
          // Supprimer les thématiques actuelles
          await db.ProjetInThematique.destroy({
            where: { id_projet },
            transaction
          });
          // Recréer les thématiques depuis la version
          if (Array.isArray(section_data.thematiques)) {
            for (const them of section_data.thematiques) {
              await db.ProjetInThematique.create({
                ...them,
                id_projet,
                ajoute_par: adminUserId
              }, { transaction });
            }
            console.log(`   ✅ ${section_data.thematiques.length} thématique(s) restaurée(s)`);
          } else {
            console.log('   ℹ️  Aucune thématique à restaurer');
          }
          break;

        case 'documents':
          console.log('   📝 Restauration des documents...');
          // Supprimer les documents actuels
          await db.Document.destroy({
            where: { id_projet },
            transaction
          });
          // Recréer les documents depuis la version
          if (Array.isArray(section_data.documents)) {
            for (const doc of section_data.documents) {
              await db.Document.create({
                ...doc,
                id_projet,
                created_by: adminUserId
              }, { transaction });
            }
            console.log(`   ✅ ${section_data.documents.length} document(s) restauré(s)`);
          } else {
            console.log('   ℹ️  Aucun document à restaurer');
          }
          break;

        case 'geometrie':
          console.log('   📝 Restauration de la géométrie...');
          // Supprimer la géométrie actuelle
          await db.ProjetGeometry.destroy({
            where: { id_projet },
            transaction
          });
          // Recréer la géométrie depuis la version
          if (section_data.geometry) {
            await db.ProjetGeometry.create({
              ...section_data.geometry,
              id_projet,
              created_by: adminUserId
            }, { transaction });
            console.log('   ✅ Géométrie restaurée');
          } else {
            console.log('   ℹ️  Aucune géométrie à restaurer');
          }
          break;

        default:
          console.log(`   ❌ Section inconnue: ${section_name}`);
          throw new Error(`Section inconnue: ${section_name}`);
      }

      // Enregistrer dans l'audit log
      await db.AuditLog.create({
        table_name: 'section_version',
        record_id: String(idVersion),
        action: 'RESTORE',
        old_values: null,
        new_values: {
          section_name,
          id_projet,
          restored_by: adminUserId,
          reason: reason || 'Restauration par admin'
        },
        changed_fields: [section_name],
        user_id: adminUserId
      }, { transaction });

      // Mettre à jour le projet
      await db.Projet.update(
        {
          updated_by: adminUserId,
          updated_at: new Date()
        },
        {
          where: { id_projet },
          transaction
        }
      );

      console.log('\n💾 Enregistrement de l\'audit log...');
      await transaction.commit();

      console.log('\n✅ RESTAURATION VERSION TERMINÉE AVEC SUCCÈS');
      console.log(`   Section: ${section_name}`);
      console.log(`   Projet: ${id_projet}`);
      console.log(`   Version: ${idVersion}`);
      console.log('=== FIN RESTAURATION VERSION ===\n');

      return res.json({
        success: true,
        message: `Section ${section_name} restaurée avec succès`,
        data: {
          id_version: idVersion,
          id_projet,
          section_name,
          restored_at: new Date(),
          restored_by: adminUserId
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('\n❌ Erreur lors de la restauration de la section:', error);
      throw error;
    }

  } catch (error) {
    console.error('\n❌ Erreur POST /api/section-versions/restore:', error);
    console.error('Stack:', error.stack);
    return res.json({
      success: false,
      message: 'Erreur lors de la restauration de la section',
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
