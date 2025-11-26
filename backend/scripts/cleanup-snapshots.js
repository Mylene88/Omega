// backend/scripts/cleanup-snapshots.js
/**
 * Script de nettoyage automatique des snapshots
 * - Supprime les snapshots de plus de 15 jours (sauf la version courante)
 * - À exécuter quotidiennement via cron ou scheduler
 */

const db = require('../models');
const { ProjetSnapshot } = db.principale;

async function cleanupOldSnapshots() {
  try {
    console.log('🧹 Démarrage du nettoyage des snapshots...\n');

    // Calculer la date limite (15 jours en arrière)
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    console.log(`📅 Date limite: ${fifteenDaysAgo.toISOString()}`);
    console.log(`🔍 Recherche des snapshots à supprimer (> 15 jours et is_current = false)...\n`);

    // Compter d'abord combien de snapshots seront supprimés
    const count = await ProjetSnapshot.count({
      where: {
        snapshot_date: {
          [db.Sequelize.Op.lt]: fifteenDaysAgo
        },
        is_current: false
      }
    });

    console.log(`📊 ${count} snapshot(s) à supprimer\n`);

    if (count === 0) {
      console.log('✅ Aucun snapshot à nettoyer\n');
      return 0;
    }

    // Supprimer les snapshots (les sections seront supprimées en cascade)
    const deleted = await ProjetSnapshot.destroy({
      where: {
        snapshot_date: {
          [db.Sequelize.Op.lt]: fifteenDaysAgo
        },
        is_current: false
      }
    });

    console.log(`✅ ${deleted} snapshot(s) supprimé(s) avec succès`);
    console.log(`   (Les sections associées ont été supprimées en cascade)\n`);

    // Statistiques après nettoyage
    const remaining = await ProjetSnapshot.count();
    console.log(`📊 Snapshots restants dans la base: ${remaining}\n`);

    return deleted;

  } catch (error) {
    console.error('❌ Erreur lors du nettoyage des snapshots:', error);
    throw error;
  }
}

// Si exécuté directement (pas en tant que module)
if (require.main === module) {
  cleanupOldSnapshots()
    .then(deleted => {
      console.log(`\n🎉 Nettoyage terminé avec succès! ${deleted} snapshot(s) supprimé(s)`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Erreur fatale:', error);
      process.exit(1);
    });
}

module.exports = cleanupOldSnapshots;
