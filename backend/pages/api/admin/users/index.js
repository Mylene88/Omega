// Force dynamic rendering (no static generation at build time)

// backend/app_backup/api/admin/users/route.js

import db from '../../../../models';
import bcrypt from 'bcryptjs';
import { checkAdminAccess } from '../../../../lib/adminAuthHelper';
import { validatePassword } from '../../../../lib/passwordPolicy';
import { validateUsername } from '../../../../lib/inputValidation';
import { logSecurityEvent, SecurityEventType } from '../../../../lib/securityLogger';

const { User, RoleEnum, sequelize } = db;

/**
 * GET /api/admin/users
 * Récupère la liste de tous les utilisateurs (admin only)
 * Query params:
 * - role: filtrer par rôle
 */


/**
 * POST /api/admin/users
 * Créer un nouvel utilisateur (admin only)
 * Body:
 * - username: string (requis, min 3 caractères)
 * - password: string (requis, min 8 caractères)
 * - prenom: string (optionnel)
 * - nom: string (optionnel)
 * - role_id: number (optionnel)
 */


/**
 * DELETE /api/admin/users
 * Supprimer un ou plusieurs utilisateurs (admin only)
 * Body:
 * - userIds: array of user IDs to delete
 */




export default async function handler(req, res) {
  if (req.method === 'GET') {

  try {
    // Vérifier l'accès admin
    const adminCheck = await checkAdminAccess(req);
    if (!adminCheck.isAdmin) {
      return res.json({
        success: false,
        message: adminCheck.error || 'Accès refusé. Droits administrateur requis.'
      }, { status: 403 });
    }

    // Query params available in req.query
    const roleFilter = req.query.role;

    const whereClause = {};
    if (roleFilter) {
      whereClause.role_id = roleFilter;
    }

    // Récupérer les utilisateurs sans l'association pour éviter les erreurs
    const users = await User.findAll({
      where: whereClause,
      attributes: [
        'id_user',
        'username',
        'prenom',
        'nom',
        'is_active',
        'role_id',
        'created_at'
      ],
      order: [['username', 'ASC']]
    });

    // Récupérer les rôles séparément
    const roles = await RoleEnum.findAll({
      attributes: ['id_role', 'libelle']
    });

    const rolesMap = {};
    roles.forEach(role => {
      rolesMap[role.id_role] = role.libelle;
    });

    // Formater les données
    const formattedUsers = users.map(user => ({
      id_user: user.id_user,
      username: user.username,
      nom_complet: `${user.prenom || ''} ${user.nom || ''}`.trim() || user.username,
      prenom: user.prenom,
      nom: user.nom,
      is_active: user.is_active,
      role_id: user.role_id,
      role_libelle: rolesMap[user.role_id] || 'N/A',
      created_at: user.created_at
    }));

    return res.json({
      success: true,
      data: formattedUsers,
      count: formattedUsers.length
    });

  } catch (error) {
    console.error('Erreur GET /api/admin/users:', error);
    return res.json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
  }
  else if (req.method === 'POST') {

  try {
    // Vérifier l'accès admin
    const adminCheck = await checkAdminAccess(req);
    if (!adminCheck.isAdmin) {
      return res.json({
        success: false,
        message: adminCheck.error || 'Accès refusé. Droits administrateur requis.'
      }, { status: 403 });
    }

    const { username, password, prenom, nom, role_id } = req.body;

    // Validation des champs requis
    if (!username || !password) {
      return res.json({
        success: false,
        message: 'Username et mot de passe requis'
      }, { status: 400 });
    }

    // Validation du format du username avec politique stricte
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return res.json({
        success: false,
        message: usernameValidation.error
      }, { status: 400 });
    }

    // Validation du mot de passe avec politique de sécurité renforcée
    const passwordValidation = validatePassword(password, { username, prenom, nom });
    if (!passwordValidation.valid) {
      return res.json({
        success: false,
        message: 'Le mot de passe ne respecte pas la politique de sécurité',
        errors: passwordValidation.errors
      }, { status: 400 });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.json({
        success: false,
        message: 'Cet username est déjà utilisé'
      }, { status: 409 });
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

    // Hasher le mot de passe avec bcrypt (salt rounds = 10)
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Créer l'utilisateur
    const newUser = await User.create({
      username,
      password_hash,
      prenom: prenom || null,
      nom: nom || null,
      role_id: role_id || null,
      first_login: true,
      is_active: true
    });

    // Récupérer le rôle
    const roles = await RoleEnum.findAll({
      attributes: ['id_role', 'libelle']
    });

    const rolesMap = {};
    roles.forEach(role => {
      rolesMap[role.id_role] = role.libelle;
    });

    // Logger la création d'utilisateur
    await logSecurityEvent({
      eventType: SecurityEventType.USER_CREATED,
      userId: adminCheck.userId,
      username: adminCheck.username,
      req,
      details: {
        newUserId: newUser.id_user,
        newUsername: newUser.username,
        roleId: newUser.role_id
      }
    });

    // Formater la réponse
    const formattedUser = {
      id_user: newUser.id_user,
      username: newUser.username,
      nom_complet: `${newUser.prenom || ''} ${newUser.nom || ''}`.trim() || newUser.username,
      prenom: newUser.prenom,
      nom: newUser.nom,
      is_active: newUser.is_active,
      role_id: newUser.role_id,
      role_libelle: rolesMap[newUser.role_id] || 'N/A',
      first_login: newUser.first_login,
      created_at: newUser.created_at
    };

    return res.json({
      success: true,
      data: formattedUser,
      message: 'Utilisateur créé avec succès'
    }, { status: 201 });

  } catch (error) {
    console.error('Erreur POST /api/admin/users:', error);
    return res.json({
      success: false,
      message: 'Erreur lors de la création de l\'utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
  }
  else if (req.method === 'DELETE') {

  try {
    // Vérifier l'accès admin
    const adminCheck = await checkAdminAccess(req);
    if (!adminCheck.isAdmin) {
      return res.json({
        success: false,
        message: adminCheck.error || 'Accès refusé. Droits administrateur requis.'
      }, { status: 403 });
    }

    const { userIds } = req.body;

    // Validation
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.json({
        success: false,
        message: 'Liste d\'utilisateurs requise (userIds doit être un tableau non vide)'
      }, { status: 400 });
    }

    // Empêcher l'admin de se supprimer lui-même
    const currentUserId = adminCheck.userId;
    if (userIds.includes(currentUserId)) {
      return res.json({
        success: false,
        message: 'Vous ne pouvez pas désactiver votre propre compte'
      }, { status: 400 });
    }

    const [deactivatedCount] = await User.update({
      is_active: false
    }, {
      where: {
        id_user: userIds,
        is_active: true
      }
    });

    if (deactivatedCount === 0) {
      return res.json({
        success: false,
        message: 'Aucun utilisateur trouvé avec ces IDs'
      }, { status: 404 });
    }

    return res.json({
      success: true,
      message: `${deactivatedCount} utilisateur(s) désactivé(s) avec succès`,
      data: {
        deactivatedCount
      }
    });

  } catch (error) {
    console.error('Erreur DELETE /api/admin/users:', error);
    return res.json({
      success: false,
      message: 'Erreur lors de la désactivation des utilisateurs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
  }
  else if (req.method === 'OPTIONS') {

  return new NextResponse(null, {
    status: 200,
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
