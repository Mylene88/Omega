// Force dynamic rendering (no static generation at build time)

// backend/app_backup/api/admin/backup/route.js

import { requireAdmin } from '../../../../lib/adminAuthHelper';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

/**
 * GET /api/admin/backup
 * Liste toutes les sauvegardes disponibles
 */


/**
 * POST /api/admin/backup
 * Déclenche une sauvegarde manuelle
 */


/**
 * DELETE /api/admin/backup
 * Supprime une sauvegarde
 */


// Fonction utilitaire pour formater les tailles de fichiers
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * OPTIONS pour CORS
 */


export default async function handler(req, res) {
  if (req.method === 'GET') {

  try {
    // Vérifier l'accès admin
    const adminCheck = await requireAdmin(req);
    if (!adminCheck.allowed) {
      return res.status(adminCheck.status ).json(adminCheck.response);
    }

    const backupDir = path.join(process.cwd(), 'backups', 'database');

    // Créer le répertoire s'il n'existe pas
    try {
      await fs.mkdir(backupDir, { recursive: true });
    } catch (err) {
      // Ignorer si le répertoire existe déjà
    }

    // Lire les fichiers de sauvegarde
    const files = await fs.readdir(backupDir);
    const backupFiles = files.filter(f => f.startsWith('omega_backup_') && f.endsWith('.sql.gz'));

    // Obtenir les détails de chaque fichier
    const backups = await Promise.all(
      backupFiles.map(async (filename) => {
        const filePath = path.join(backupDir, filename);
        const stats = await fs.stat(filePath);

        // Extraire la date du nom du fichier
        // Format: omega_backup_2024-12-04_03-00-00.sql.gz
        const match = filename.match(/omega_backup_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})\.sql\.gz/);
        let createdAt = stats.mtime;
        if (match) {
          const [, date, time] = match;
          const dateStr = `${date}T${time.replace(/-/g, ':')}`;
          createdAt = new Date(dateStr);
        }

        return {
          filename,
          size: stats.size,
          sizeFormatted: formatBytes(stats.size),
          createdAt: createdAt.toISOString(),
          path: filePath
        };
      })
    );

    // Trier par date décroissante (plus récent en premier)
    backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log(`📊 [BACKUP] Liste des sauvegardes: ${backups.length} fichiers`);

    return res.json({
      success: true,
      data: backups,
      count: backups.length
    });

  } catch (error) {
    console.error('❌ [BACKUP] Erreur GET:', error);
    return res.json({
      success: false,
      message: 'Erreur lors de la récupération des sauvegardes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
  }
  else if (req.method === 'POST') {

  try {
    // Vérifier l'accès admin
    const adminCheck = await requireAdmin(req);
    if (!adminCheck.allowed) {
      return res.status(adminCheck.status ).json(adminCheck.response);
    }

    console.log('🚀 [BACKUP] Démarrage de la sauvegarde manuelle...');

    const scriptPath = path.join(process.cwd(), 'backend', 'scripts', 'backup-database.sh');

    // Vérifier l'existence du script
    try {
      await fs.access(scriptPath, fs.constants.X_OK);
    } catch (err) {
      console.error('❌ [BACKUP] Script non trouvé ou non exécutable:', scriptPath);
      return res.json({
        success: false,
        message: 'Script de sauvegarde non trouvé ou non exécutable'
      }, { status: 500 });
    }

    // Exécuter le script de sauvegarde
    const { stdout, stderr } = await execAsync(`bash "${scriptPath}"`, {
      timeout: 300000, // 5 minutes max
      maxBuffer: 10 * 1024 * 1024 // 10MB
    });

    console.log('✅ [BACKUP] Sauvegarde terminée avec succès');
    console.log('📝 [BACKUP] Output:', stdout);

    if (stderr && stderr.length > 0) {
      console.warn('⚠️  [BACKUP] Warnings:', stderr);
    }

    // Extraire le nom du fichier créé depuis stdout (dernière ligne non vide)
    const lines = stdout.trim().split('\n');
    const backupFilePath = lines[lines.length - 1];
    const filename = path.basename(backupFilePath);

    return res.json({
      success: true,
      message: 'Sauvegarde créée avec succès',
      data: {
        filename,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [BACKUP] Erreur POST:', error);
    return res.json({
      success: false,
      message: 'Erreur lors de la création de la sauvegarde',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: error.stderr || error.stdout
    }, { status: 500 });
  }
  }
  else if (req.method === 'DELETE') {

  try {
    // Vérifier l'accès admin
    const adminCheck = await requireAdmin(req);
    if (!adminCheck.allowed) {
      return res.status(adminCheck.status ).json(adminCheck.response);
    }

    // Query params available in req.query
    const filename = req.query.filename;

    if (!filename) {
      return res.json({
        success: false,
        message: 'Nom du fichier requis'
      }, { status: 400 });
    }

    // Vérifier que le nom du fichier est sécurisé (pas de path traversal)
    if (filename.includes('..') || filename.includes('/')) {
      return res.json({
        success: false,
        message: 'Nom de fichier invalide'
      }, { status: 400 });
    }

    const backupDir = path.join(process.cwd(), 'backups', 'database');
    const filePath = path.join(backupDir, filename);

    // Vérifier que le fichier existe
    try {
      await fs.access(filePath);
    } catch (err) {
      return res.json({
        success: false,
        message: 'Fichier non trouvé'
      }, { status: 404 });
    }

    // Supprimer le fichier
    await fs.unlink(filePath);

    console.log(`🗑️  [BACKUP] Sauvegarde supprimée: ${filename}`);

    return res.json({
      success: true,
      message: 'Sauvegarde supprimée avec succès'
    });

  } catch (error) {
    console.error('❌ [BACKUP] Erreur DELETE:', error);
    return res.json({
      success: false,
      message: 'Erreur lors de la suppression de la sauvegarde',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
  }
  else if (req.method === 'OPTIONS') {

  return res.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
  }
  else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}
