// Force dynamic rendering (no static generation at build time)

// backend/app_backup/api/section-versions/restore/route.js
/**
 * API pour restaurer une version spécifique d'une section
 */

import { requireAdmin } from '../../../../lib/adminAuthHelper';
import db from '../../../../models';

const asArray = (data, wrapperKey) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data[wrapperKey])) return data[wrapperKey];
  return [];
};

const asObject = (data, wrapperKey = null) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  if (wrapperKey && data[wrapperKey] && typeof data[wrapperKey] === 'object' && !Array.isArray(data[wrapperKey])) {
    return data[wrapperKey];
  }
  return data;
};

const normalizeSuivis = (rawSuivis) => {
  const source = asArray(rawSuivis, 'suivis');

  return source
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;

      const contenu = entry.suivi ?? entry.contenu ?? entry.texte ?? entry.description ?? null;
      if (!contenu || !String(contenu).trim()) return null;

      return {
        suivi: String(contenu).trim(),
        created_by: entry.created_by ?? entry.cree_par ?? entry.ajoute_par ?? null,
        created_at: entry.created_at ?? entry.dateCreation ?? entry.date_ajout ?? null
      };
    })
    .filter(Boolean);
};

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
          // Compatibilité: accepter les anciens champs statut_id/id_service_ddt.
          const projetInfo = asObject(section_data);
          await db.Projet.update(
            {
              nom_projet: projetInfo.nom_projet,
              description: projetInfo.description,
              statut_projet_id: projetInfo.statut_projet_id ?? projetInfo.statut_id ?? null,
              date_ident_projet: projetInfo.date_ident_projet,
              projet_signale: projetInfo.projet_signale,
              charte_accueil: projetInfo.charte_accueil,
              service_id: projetInfo.service_id ?? projetInfo.id_service_ddt ?? null,
              referent_ddt: projetInfo.referent_ddt,
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
          await db.ProjetPorteur.destroy({
            where: { id_projet },
            transaction
          });

          const porteurs = asArray(section_data, 'porteurs');
          if (porteurs.length > 0) {
            for (const porteur of porteurs) {
              await db.ProjetPorteur.create({
                id_projet,
                type_porteur_id: porteur.type_porteur_id ?? null,
                autre_type_porteur: porteur.autre_type_porteur ?? null,
                nom_structure: porteur.nom_structure || '',
                referent_nom: porteur.referent_nom ?? null,
                referent_fonction: porteur.referent_fonction ?? null,
                referent_email: porteur.referent_email ?? null,
                referent_tel: porteur.referent_tel ?? null
              }, { transaction });
            }
            console.log(`   ✅ ${porteurs.length} porteur(s) restauré(s)`);
          } else {
            console.log('   ℹ️  Aucun porteur à restaurer');
          }
          break;

        case 'suivis':
          console.log('   📝 Restauration des suivis...');
          await db.ProjetSuivi.destroy({
            where: { id_projet },
            transaction
          });

          const suivis = normalizeSuivis(section_data);
          if (suivis.length > 0) {
            for (const suivi of suivis) {
              await db.ProjetSuivi.create({
                id_projet,
                suivi: suivi.suivi,
                created_by: suivi.created_by || adminUserId,
                created_at: suivi.created_at || new Date()
              }, { transaction });
            }
            console.log(`   ✅ ${suivis.length} suivi(s) restauré(s)`);
          } else {
            console.log('   ℹ️  Aucun suivi à restaurer');
          }
          break;

        case 'thematiques':
          console.log('   📝 Restauration des thématiques...');
          await db.ProjetInThematique.destroy({
            where: { id_projet },
            transaction
          });

          const thematiques = asArray(section_data, 'thematiques');
          if (thematiques.length > 0) {
            for (const them of thematiques) {
              if (!them.id_thematique) continue;
              await db.ProjetInThematique.create({
                id_projet,
                id_thematique: them.id_thematique,
                ajoute_par: them.ajoute_par || adminUserId,
                date_ajout: them.date_ajout || new Date()
              }, { transaction });
            }
            console.log(`   ✅ ${thematiques.length} thématique(s) restaurée(s)`);
          } else {
            console.log('   ℹ️  Aucune thématique à restaurer');
          }
          break;

        case 'documents':
          console.log('   📝 Restauration des documents...');
          await db.Document.destroy({
            where: { id_projet },
            transaction
          });

          const documents = asArray(section_data, 'documents');
          if (documents.length > 0) {
            for (const doc of documents) {
              await db.Document.create({
                id_projet,
                lien_local: doc.lien_local || null,
                lien_web: doc.lien_web || null
              }, { transaction });
            }
            console.log(`   ✅ ${documents.length} document(s) restauré(s)`);
          } else {
            console.log('   ℹ️  Aucun document à restaurer');
          }
          break;

        case 'geometrie':
          console.log('   📝 Restauration de la géométrie...');
          await db.ProjetGeometry.destroy({
            where: { id_projet },
            transaction
          });

          const geometry = asObject(section_data, 'geometry');
          if (Object.keys(geometry).length > 0) {
            await db.ProjetGeometry.create({
              id_projet,
              geom_type: geometry.geom_type || null,
              geom: geometry.geom || null,
              area_m2: geometry.area_m2 || null,
              length_m: geometry.length_m || null,
              communes_traversees: Array.isArray(geometry.communes_traversees) ? geometry.communes_traversees : [],
              codes_insee: Array.isArray(geometry.codes_insee) ? geometry.codes_insee : [],
              epci: Array.isArray(geometry.epci) ? geometry.epci : [],
              arrondissements: Array.isArray(geometry.arrondissements) ? geometry.arrondissements : [],
              deputes: Array.isArray(geometry.deputes) ? geometry.deputes : [],
              maires: Array.isArray(geometry.maires) ? geometry.maires : []
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
