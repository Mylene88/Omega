// Force dynamic rendering (no static generation at build time)

// backend/app_backup/api/admin/users/[id]/route.js

import db from '../../../../../models';
import bcrypt from 'bcryptjs';
import { checkAdminAccess } from '../../../../../lib/adminAuthHelper';

const { User, RoleEnum } = db;

/**
 * PUT /api/admin/users/:id
 * Modifier un utilisateur (admin only)
 * Body:
 * - prenom: string (optionnel)
 * - nom: string (optionnel)
 * - role_id: number (optionnel)
 * - password: string (optionnel, min 8 caractères)
 * - first_login: boolean (optionnel)
 */




export default async function handler(req, res, params) {
  console.log('📥 [PUT /api/admin/users/:id] Reçu');
  console.log('📥 params type:', typeof params);
  console.log('📥 params:', JSON.stringify(params));
  console.log('📥 req.method:', req.method);
  console.log('📥 req.headers.content-type:', req.headers['content-type']);
  console.log('📥 typeof req.body:', typeof req.body);
  
  if (req.method === 'PUT') {

  try {
    // Vérifier l'accès admin
    const adminCheck = await checkAdminAccess(req);
    if (!adminCheck.isAdmin) {
      return res.json({
        success: false,
        message: adminCheck.error || 'Accès refusé. Droits administrateur requis.'
      }, { status: 403 });
    }

    // Extraire l'ID utilisateur
    let userId;
    if (params && params.id) {
      userId = parseInt(params.id);
    } else {
      // Fallback: parser l'URL
      const urlParts = req.url?.split('/');
      const idPart = urlParts?.[urlParts.length - 1];
      userId = parseInt(idPart);
      console.log('⚠️ params.id manquant, extraction depuis URL:', userId);
    }

    console.log('📥 userId:', userId);

    if (isNaN(userId)) {
      return res.json({
        success: false,
        message: 'ID utilisateur invalide'
      }, { status: 400 });
    }

    const { prenom, nom, role_id, password, first_login } = req.body;
    console.log('📥 req.body:', req.body);
    console.log('📥 password:', password ? 'présent' : 'absent');

    // Vérifier que l'utilisateur existe
    const user = await User.findByPk(userId);
    if (!user) {
      return res.json({
        success: false,
        message: 'Utilisateur non trouvé'
      }, { status: 404 });
    }

    // Vérifier que le rôle existe si fourni
    if (role_id) {
      const role = await RoleEnum.findByPk(role_id);
      if (!role) {
        return res.json({
          success: false,
          message: 'Rôle invalide'
        }, { status: 400 });
      }
    }

    // Préparer les données de mise à jour
    const updateData = {};

    if (prenom !== undefined) updateData.prenom = prenom;
    if (nom !== undefined) updateData.nom = nom;
    if (role_id !== undefined) updateData.role_id = role_id;
    if (first_login !== undefined) updateData.first_login = first_login;

    // Hasher le nouveau mot de passe si fourni
    if (password) {
      console.log('🔐 Nouveau mot de passe détecté, hash en cours...');
      if (password.length < 8) {
        return res.json({
          success: false,
          message: 'Le mot de passe doit contenir au moins 8 caractères'
        }, { status: 400 });
      }

      const saltRounds = 10;
      updateData.password_hash = await bcrypt.hash(password, saltRounds);

      // Si un nouveau mot de passe est défini, forcer le changement à la prochaine connexion
      updateData.first_login = true;
    }

    // Mettre à jour l'utilisateur
    console.log('💾 Mise à jour utilisateur avec:', updateData);
    await user.update(updateData);

    // Récupérer l'utilisateur mis à jour avec ses relations
    const updatedUser = await User.findByPk(userId, {
      attributes: ['id_user', 'username', 'prenom', 'nom', 'role_id', 'first_login', 'created_at'],
      include: [
        {
          model: RoleEnum,
          as: 'role_enum',
          attributes: ['id_role', 'libelle']
        }
      ]
    });

    // Récupérer tous les rôles pour le mapping
    const roles = await RoleEnum.findAll({
      attributes: ['id_role', 'libelle']
    });

    const rolesMap = {};
    roles.forEach(role => {
      rolesMap[role.id_role] = role.libelle;
    });

    // Formater la réponse
    const formattedUser = {
      id_user: updatedUser.id_user,
      username: updatedUser.username,
      nom_complet: `${updatedUser.prenom || ''} ${updatedUser.nom || ''}`.trim() || updatedUser.username,
      prenom: updatedUser.prenom,
      nom: updatedUser.nom,
      role_id: updatedUser.role_id,
      role_libelle: rolesMap[updatedUser.role_id] || 'N/A',
      first_login: updatedUser.first_login,
      created_at: updatedUser.created_at
    };

    return res.json({
      success: true,
      data: formattedUser,
      message: 'Utilisateur modifié avec succès'
    });

  } catch (error) {
    console.error('Erreur PUT /api/admin/users/:id:', error);
    return res.json({
      success: false,
      message: 'Erreur lors de la modification de l\'utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
  }
  else if (req.method === 'OPTIONS') {

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
  }
  else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}
