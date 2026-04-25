// backend/pages/api/projets/snapshots/restore/index.js
/**
 * API pour restaurer des sections depuis un snapshot
 */

import { requireAdmin } from '../../../../../lib/adminAuthHelper';
import db from '../../../../../models';
import { createSnapshot } from '../../../../../lib/auditHelper';
const { ProjetSnapshot, ProjetSnapshotSection } = db;

const asArray = (value, wrapperKey = null) => {
  if (Array.isArray(value)) return value;
  if (wrapperKey && value && Array.isArray(value[wrapperKey])) return value[wrapperKey];
  return [];
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

export default async function handler(req, res) {
  /**
   * POST /api/projets/snapshots/restore
   * Restaurer une ou plusieurs sections depuis un snapshot
   */
  if (req.method === 'POST') {
    try {
      console.log('\n=== 🔄 RESTAURATION SNAPSHOT ===');

      // Vérifier les droits admin
      const adminCheck = await requireAdmin(req);
      if (!adminCheck.allowed) {
        console.log('❌ Droits admin requis');
        return res.status(adminCheck.status).json(adminCheck.response);
      }
      const adminUserId = adminCheck.userId;
      console.log(`Admin User ID: ${adminUserId}`);

      const body = req.body;
      const { id_snapshot, sections, reason, createBackup = true } = body;
      const shouldCreateBackup = createBackup !== false;

      console.log(`Snapshot ID: ${id_snapshot}`);
      console.log(`Sections: ${sections?.join(', ')}`);
      console.log(`Raison: ${reason || 'Aucune'}`);

      // Validation
      if (!id_snapshot || !sections || !Array.isArray(sections) || sections.length === 0) {
        console.log('❌ Paramètres invalides');
        return res.status(400).json({
          success: false,
          message: 'id_snapshot et sections (array) requis'
        });
      }

      // Vérifier que le snapshot existe
      const snapshot = await db.ProjetSnapshot.findOne({
        where: { id_snapshot }
      });

      if (!snapshot) {
        console.log('❌ Snapshot introuvable');
        return res.status(404).json({
          success: false,
          message: 'Snapshot introuvable'
        });
      }

      const id_projet = snapshot.id_projet;
      console.log(`Projet ID: ${id_projet}`);

      let backupSnapshot = null;
      if (shouldCreateBackup) {
        console.log('📸 Création du backup avant restauration partielle...');
        const currentProjet = await db.Projet.findByPk(id_projet, {
          include: [
            { model: db.ProjetPorteur, as: 'porteurs' },
            { model: db.ProjetSuivi, as: 'suivis' },
            { model: db.Document, as: 'documents' },
            { model: db.ProjetGeometry, as: 'geometry' },
            { model: db.ProjetInThematique, as: 'projet_in_thematiques' }
          ]
        });

        if (currentProjet) {
          backupSnapshot = await createSnapshot({
            idProjet: id_projet,
            projetData: currentProjet.toJSON(),
            description: `Backup automatique avant restauration partielle du snapshot #${id_snapshot}`,
            userId: adminUserId,
            skipRotation: true
          });
          console.log(`✅ Backup créé (#${backupSnapshot?.id_snapshot || 'inconnu'})`);
        }
      }

      // Récupérer les sections demandées
      const snapshotSections = await db.ProjetSnapshotSection.findAll({
        where: {
          id_snapshot,
          section_name: sections
        }
      });

      if (snapshotSections.length === 0) {
        console.log('❌ Aucune section trouvée');
        return res.status(404).json({
          success: false,
          message: 'Aucune section trouvée pour ce snapshot'
        });
      }

      console.log(`✅ ${snapshotSections.length} section(s) trouvée(s)`);

      // Démarrer une transaction
      console.log('\n🔒 Démarrage de la transaction...');
      const transaction = await db.sequelize.transaction();

      try {
        // Restaurer chaque section
        for (const snapshotSection of snapshotSections) {
          const { section_name, section_data } = snapshotSection;
          console.log(`\n🔄 Restauration de "${section_name}"...`);

          switch (section_name) {
            case 'projet_info':
              console.log('   📝 Restauration des informations du projet...');
              await db.Projet.update(
                {
                  nom_projet: section_data.nom_projet,
                  description: section_data.description,
                  statut_projet_id: section_data.statut_projet_id,
                  date_ident_projet: section_data.date_ident_projet,
                  projet_signale: section_data.projet_signale,
                  charte_accueil: section_data.charte_accueil,
                  service_id: section_data.service_id,
                  referent_ddt: section_data.referent_ddt,
                  updated_by: adminUserId,
                  updated_at: new Date()
                },
                {
                  where: { id_projet },
                  transaction
                }
              );
              console.log('   ✅ Informations restaurées');
              break;

            case 'porteurs':
              console.log('   📝 Restauration des porteurs...');
              await db.ProjetPorteur.destroy({ where: { id_projet }, transaction });
              if (Array.isArray(section_data) && section_data.length > 0) {
                for (const porteur of section_data) {
                  const { id_porteur, ...porteurData } = porteur;
                  await db.ProjetPorteur.create({
                    ...porteurData,
                    id_projet
                  }, { transaction });
                }
                console.log(`   ✅ ${section_data.length} porteur(s) restauré(s)`);
              } else {
                console.log('   ℹ️  Aucun porteur à restaurer');
              }
              break;

            case 'suivis':
              console.log('   📝 Restauration des suivis...');
              await db.ProjetSuivi.destroy({ where: { id_projet }, transaction });
              {
                const normalizedSuivis = normalizeSuivis(section_data);
                if (normalizedSuivis.length > 0) {
                  for (const suivi of normalizedSuivis) {
                    await db.ProjetSuivi.create({
                      id_projet,
                      suivi: suivi.suivi,
                      created_by: suivi.created_by || adminUserId,
                      created_at: suivi.created_at || new Date()
                    }, { transaction });
                  }
                  console.log(`   ✅ ${normalizedSuivis.length} suivi(s) restauré(s)`);
                } else {
                  console.log('   ℹ️  Aucun suivi à restaurer');
                }
              }
              break;

            case 'thematiques':
              console.log('   📝 Restauration des thématiques...');
              await db.ProjetInThematique.destroy({ where: { id_projet }, transaction });
              if (Array.isArray(section_data) && section_data.length > 0) {
                for (const them of section_data) {
                  const { id, ...themData } = them;
                  await db.ProjetInThematique.create({
                    ...themData,
                    id_projet,
                    ajoute_par: adminUserId
                  }, { transaction });
                }
                console.log(`   ✅ ${section_data.length} thématique(s) restaurée(s)`);
              } else {
                console.log('   ℹ️  Aucune thématique à restaurer');
              }
              break;

            case 'documents':
              console.log('   📝 Restauration des documents...');
              await db.Document.destroy({ where: { id_projet }, transaction });
              if (Array.isArray(section_data) && section_data.length > 0) {
                for (const doc of section_data) {
                  const { id_document, ...docData } = doc;
                  await db.Document.create({
                    ...docData,
                    id_projet
                  }, { transaction });
                }
                console.log(`   ✅ ${section_data.length} document(s) restauré(s)`);
              } else {
                console.log('   ℹ️  Aucun document à restaurer');
              }
              break;

            case 'geometrie':
              console.log('   📝 Restauration de la géométrie...');
              await db.ProjetGeometry.destroy({ where: { id_projet }, transaction });
              if (section_data && Object.keys(section_data).length > 0) {
                const { id_geometry, ...geomData } = section_data;
                await db.ProjetGeometry.create({
                  ...geomData,
                  id_projet
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
        }

        // Enregistrer dans l'audit log
        await db.AuditLog.create({
          table_name: 'projet_snapshot',
          record_id: String(id_snapshot),
          action: 'RESTORE',
          old_values: null,
          new_values: {
            sections: sections,
            id_projet,
            restored_by: adminUserId,
            reason: reason || 'Restauration depuis snapshot par admin'
          },
          changed_fields: sections,
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

        console.log('\n💾 Commit de la transaction...');
        await transaction.commit();

        console.log('\n✅ RESTAURATION SNAPSHOT TERMINÉE AVEC SUCCÈS');
        console.log(`   Snapshot: ${id_snapshot}`);
        console.log(`   Projet: ${id_projet}`);
        console.log(`   Sections: ${sections.join(', ')}`);
        console.log('=== FIN RESTAURATION SNAPSHOT ===\n');

        return res.status(200).json({
          success: true,
          message: `${snapshotSections.length} section(s) restaurée(s) avec succès`,
          data: {
            id_snapshot,
            id_projet,
            sections_restored: sections,
            backup_snapshot_id: backupSnapshot?.id_snapshot || null,
            restored_at: new Date(),
            restored_by: adminUserId
          }
        });

      } catch (error) {
        await transaction.rollback();
        console.error('\n❌ Erreur lors de la restauration:', error);
        throw error;
      }

    } catch (error) {
      console.error('\n❌ Erreur POST /api/projets/snapshots/restore:', error);
      console.error('Stack:', error.stack);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la restauration',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  /**
   * GET /api/projets/snapshots/restore?id_snapshot=X&section_name=Y
   * Récupérer une section spécifique d'un snapshot
   */
  else if (req.method === 'GET') {
    const { id_snapshot, section_name } = req.query;

    try {
      // Validation
      const validSections = ['projet_info', 'porteurs', 'suivis', 'thematiques', 'documents', 'geometrie'];
      if (!validSections.includes(section_name)) {
        return res.status(400).json({
          success: false,
          error: `Section invalide. Doit être parmi: ${validSections.join(', ')}`
        });
      }

      // Récupérer la section
      const section = await ProjetSnapshotSection.findOne({
        where: { id_snapshot, section_name },
        include: [{
          model: ProjetSnapshot,
          as: 'snapshot',
          attributes: ['id_snapshot', 'version_number', 'snapshot_date', 'description', 'id_projet']
        }]
      });

      if (!section) {
        return res.status(404).json({
          success: false,
          error: 'Section introuvable dans ce snapshot'
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          snapshot_info: {
            id_snapshot: section.snapshot.id_snapshot,
            version_number: section.snapshot.version_number,
            snapshot_date: section.snapshot.snapshot_date,
            description: section.snapshot.description,
            id_projet: section.snapshot.id_projet
          },
          section_name,
          section_data: section.section_data
        }
      });

    } catch (error) {
      console.error('❌ Erreur récupération section:', error);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération de la section',
        details: error.message
      });
    }
  }
  else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}
