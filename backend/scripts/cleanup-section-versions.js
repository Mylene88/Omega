// backend/scripts/cleanup-section-versions.js
/**
 * Script de nettoyage automatique des versions de sections
 * - Supprime les versions de plus de 15 jours
 * - Garde maximum 10 versions par section par utilisateur
 *
 * Usage:
 * node backend/scripts/cleanup-section-versions.js
 */

const db = require('../models');
const { Op } = require('sequelize');

async function cleanupSectionVersions() {
  try {
    console.log('🧹 Début du nettoyage des versions de sections...\n');

    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    // 1. Supprimer les versions de plus de 15 jours
    const deletedOldVersions = await db.SectionVersion.destroy({
      where: {
        snapshot_date: {
          [Op.lt]: fifteenDaysAgo
        }
      }
    });

    console.log(`✅ ${deletedOldVersions} version(s) de plus de 15 jours supprimée(s)`);

    // 2. Pour chaque combinaison (projet, user, section), garder max 10 versions
    const allCombinations = await db.SectionVersion.findAll({
      attributes: [
        'id_projet',
        'user_id',
        'section_name'
      ],
      group: ['id_projet', 'user_id', 'section_name'],
      raw: true
    });

    let totalExcessVersions = 0;

    for (const combo of allCombinations) {
      const { id_projet, user_id, section_name } = combo;

      // Compter combien de versions existent pour cette combinaison
      const count = await db.SectionVersion.count({
        where: {
          id_projet,
          user_id,
          section_name
        }
      });

      if (count > 10) {
        // Récupérer les versions à garder (les 10 plus récentes)
        const versionsToKeep = await db.SectionVersion.findAll({
          where: {
            id_projet,
            user_id,
            section_name
          },
          order: [['snapshot_date', 'DESC']],
          limit: 10,
          attributes: ['id_version']
        });

        const idsToKeep = versionsToKeep.map(v => v.id_version);

        // Supprimer toutes les autres versions
        const deleted = await db.SectionVersion.destroy({
          where: {
            id_projet,
            user_id,
            section_name,
            id_version: {
              [Op.notIn]: idsToKeep
            }
          }
        });

        totalExcessVersions += deleted;
        console.log(`  📦 Projet ${id_projet}, User ${user_id}, Section ${section_name}: ${deleted} version(s) en excès supprimée(s)`);
      }
    }

    console.log(`\n✅ ${totalExcessVersions} version(s) en excès supprimée(s) (max 10 par section par utilisateur)`);

    // 3. Statistiques finales
    const remainingCount = await db.SectionVersion.count();
    const stats = await db.SectionVersion.findAll({
      attributes: [
        'section_name',
        [db.sequelize.fn('COUNT', db.sequelize.col('id_version')), 'count']
      ],
      group: ['section_name'],
      raw: true
    });

    console.log(`\n📊 Statistiques après nettoyage:`);
    console.log(`   Total versions restantes: ${remainingCount}`);
    console.log(`   Par section:`);
    stats.forEach(stat => {
      console.log(`     - ${stat.section_name}: ${stat.count} versions`);
    });

    console.log('\n✅ Nettoyage terminé avec succès');

    return {
      success: true,
      deletedOldVersions,
      deletedExcessVersions: totalExcessVersions,
      remainingVersions: remainingCount,
      stats
    };

  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
    throw error;
  }
}

// Exécution si appelé directement
if (require.main === module) {
  cleanupSectionVersions()
    .then(() => {
      console.log('\n✅ Script terminé');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erreur:', error);
      process.exit(1);
    });
}

module.exports = { cleanupSectionVersions };
