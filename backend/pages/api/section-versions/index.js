// Force dynamic rendering (no static generation at build time)

// backend/app/api/section-versions/route.js
/**
 * API pour gérer le versioning granulaire par section
 * - Sauvegarde automatique d'une section spécifique
 * - Max 10 versions par section par utilisateur
 * - Rétention 15 jours
 * - Restauration sélective
 */

import { requireAuth } from '../../../lib/authHelper';
import db from '../../../models';
import { Op } from 'sequelize';

/**
 * POST /api/section-versions
 * Sauvegarder une version d'une section spécifique
 *
 * Body:
 * - idProjet: ID du projet
 * - sectionName: nom de la section ('projet_info', 'porteurs', 'suivis', etc.)
 * - sectionData: données de la section (JSONB)
 * - description: description optionnelle
 */


/**
 * GET /api/section-versions
 * Récupérer les versions d'une section spécifique
 *
 * Query params:
 * - idProjet: ID du projet (requis)
 * - sectionName: nom de la section (requis)
 * - userId: ID utilisateur (optionnel, si non fourni = utilisateur connecté)
 * - limit: nombre max de versions (défaut: 10)
 */


/**
 * OPTIONS pour CORS
 */


export default async function handler(req, res) {
  if (req.method === 'GET') {

  try {
    console.log('\n=== 📖 RÉCUPÉRATION VERSIONS DE SECTION ===');

    // Authentification
    const authResult = await requireAuth(req);
    if (!authResult.allowed) {
      console.log('❌ Authentification échouée');
      return res.status(authResult.status ).json(authResult.response);
    }
    const currentUserId = authResult.userId;
    console.log(`User ID: ${currentUserId}`);

    // Query params available in req.query
    const idProjet = req.query.idProjet;
    const sectionName = req.query.sectionName;
    const userId = req.query.userId || currentUserId;
    const limit = parseInt(req.query.limit || '10');

    console.log(`Projet ID: ${idProjet}`);
    console.log(`Section: ${sectionName}`);
    console.log(`Filtre userId: ${userId}`);
    console.log(`Limite: ${limit}`);

    // Validation
    if (!idProjet || !sectionName) {
      console.log('❌ Paramètres manquants');
      return res.json({
        success: false,
        message: 'idProjet et sectionName sont requis'
      }, { status: 400 });
    }

    // Récupérer les versions avec les données de l'utilisateur
    console.log('🔍 Recherche des versions en base de données...');
    const versions = await db.SectionVersion.findAll({
      where: {
        id_projet: idProjet,
        section_name: sectionName,
        user_id: userId
      },
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id_user', 'username', 'prenom', 'nom']
        },
        {
          model: db.Projet,
          as: 'projet',
          attributes: ['id_projet', 'nom_projet']
        }
      ],
      order: [['version_number', 'DESC']],
      limit
    });

    console.log(`✅ ${versions.length} version(s) trouvée(s)`);

    // Formater la réponse
    const formattedVersions = versions.map(v => ({
      id_version: v.id_version,
      version_number: v.version_number,
      section_name: v.section_name,
      snapshot_date: v.snapshot_date,
      is_current: v.is_current,
      description: v.description,
      metadata: v.metadata,
      created_by: v.user ? {
        id: v.user.id_user,
        username: v.user.username,
        nom_complet: `${v.user.prenom || ''} ${v.user.nom || ''}`.trim() || v.user.username
      } : null,
      projet: {
        id: v.projet?.id_projet,
        nom: v.projet?.nom_projet
      }
    }));

    console.log('=== FIN RÉCUPÉRATION VERSIONS ===\n');

    return res.json({
      success: true,
      data: formattedVersions,
      count: formattedVersions.length,
      filters: {
        idProjet,
        sectionName,
        userId
      }
    });

  } catch (error) {
    console.error('\n❌ Erreur GET /api/section-versions:', error);
    console.error('Stack:', error.stack);
    return res.json({
      success: false,
      message: 'Erreur lors de la récupération des versions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
  }
  else if (req.method === 'POST') {

  try {
    console.log('\n=== 📝 CRÉATION VERSION DE SECTION ===');

    // Authentification
    const authResult = await requireAuth(req);
    if (!authResult.allowed) {
      console.log('❌ Authentification échouée');
      return res.status(authResult.status ).json(authResult.response);
    }
    const userId = authResult.userId;
    console.log(`User ID: ${userId}`);

    const body = req.body;
    const { idProjet, sectionName, sectionData, description } = body;

    console.log(`Projet ID: ${idProjet}`);
    console.log(`Section: ${sectionName}`);
    console.log(`Description: ${description || 'Aucune'}`);

    // Validation
    if (!idProjet || !sectionName || !sectionData) {
      console.log('❌ Paramètres manquants');
      return res.json({
        success: false,
        message: 'idProjet, sectionName et sectionData sont requis'
      }, { status: 400 });
    }

    const validSections = ['projet_info', 'porteurs', 'suivis', 'thematiques', 'documents', 'geometrie'];
    if (!validSections.includes(sectionName)) {
      console.log(`❌ Section invalide: ${sectionName}`);
      return res.json({
        success: false,
        message: `Section invalide. Doit être parmi: ${validSections.join(', ')}`
      }, { status: 400 });
    }

    // Vérifier que le projet existe
    const projet = await db.Projet.findByPk(idProjet);
    if (!projet) {
      console.log('❌ Projet non trouvé');
      return res.json({
        success: false,
        message: 'Projet non trouvé'
      }, { status: 404 });
    }
    console.log(`✅ Projet trouvé: ${projet.nom_projet}`);

    // Calculer le prochain numéro de version (1-10 avec rotation circulaire)
    console.log('\n🔢 Calcul du numéro de version...');
    const maxVersion = await db.SectionVersion.findOne({
      where: {
        id_projet: idProjet,
        user_id: userId,
        section_name: sectionName
      },
      order: [['version_number', 'DESC']]
    });

    let nextVersion = 1;
    if (maxVersion) {
      console.log(`   Version maximale existante: ${maxVersion.version_number}`);
      nextVersion = maxVersion.version_number >= 10 ? 1 : maxVersion.version_number + 1;

      // Si on réutilise le numéro 1, supprimer l'ancienne version
      if (nextVersion === 1) {
        console.log('   🔄 Rotation détectée - Suppression de la version 1 existante');
        await db.SectionVersion.destroy({
          where: {
            id_projet: idProjet,
            user_id: userId,
            section_name: sectionName,
            version_number: 1
          }
        });
      }
    } else {
      console.log('   ℹ️  Aucune version existante');
    }
    console.log(`   ✅ Prochaine version: ${nextVersion}`);

    // Démarquer toutes les versions précédentes comme non-courantes
    console.log('📝 Mise à jour des versions précédentes...');
    await db.SectionVersion.update(
      { is_current: false },
      {
        where: {
          id_projet: idProjet,
          user_id: userId,
          section_name: sectionName
        }
      }
    );

    // Analyser les données
    const dataLength = Array.isArray(sectionData)
      ? sectionData.length
      : (typeof sectionData === 'object' ? Object.keys(sectionData).length : 1);
    console.log(`📦 Données à sauvegarder: ${dataLength} élément(s)`);

    // Créer la nouvelle version
    console.log('💾 Création de la version en base de données...');
    const version = await db.SectionVersion.create({
      id_projet: idProjet,
      user_id: userId,
      section_name: sectionName,
      version_number: nextVersion,
      section_data: sectionData,
      snapshot_date: new Date(),
      is_current: true,
      description: description || `Version ${nextVersion} de ${sectionName}`,
      metadata: {
        saved_at: new Date().toISOString(),
        data_size: JSON.stringify(sectionData).length
      }
    });

    console.log(`\n✅ Version ${nextVersion} sauvegardée avec succès`);
    console.log(`   ID version: ${version.id_version}`);
    console.log(`   Section: ${sectionName}`);
    console.log(`   Projet: ${idProjet}`);
    console.log('=== FIN CRÉATION VERSION ===\n');

    return res.json({
      success: true,
      message: `Version ${nextVersion} de ${sectionName} sauvegardée`,
      data: {
        id_version: version.id_version,
        version_number: version.version_number,
        section_name: version.section_name,
        snapshot_date: version.snapshot_date,
        is_current: version.is_current
      }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Erreur POST /api/section-versions:', error);
    return res.json({
      success: false,
      message: 'Erreur lors de la sauvegarde de la section',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
  }
  else if (req.method === 'OPTIONS') {

  return res.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
  }
  else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}
