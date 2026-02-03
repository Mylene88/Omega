// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic';

// backend/app_backup/api/admin/users/route.js

import { NextResponse } from 'next/server';
import db from '@/backend/models';
import bcrypt from 'bcryptjs';
import { checkAdminAccess } from '@/backend/lib/adminAuthHelper';
import { validatePassword } from '@/backend/lib/passwordPolicy';
import { validateUsername } from '@/backend/lib/inputValidation';
import { logSecurityEvent, SecurityEventType } from '@/backend/lib/securityLogger';

const { User, RoleEnum, sequelize } = db;

/**
 * GET /api/admin/users
 * Récupère la liste de tous les utilisateurs (admin only)
 * Query params:
 * - role: filtrer par rôle
 */
export async function GET(request) {
  try {
    // Vérifier l'accès admin
    const adminCheck = await checkAdminAccess(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json({
        success: false,
        message: adminCheck.error || 'Accès refusé. Droits administrateur requis.'
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get('role');

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
      role_id: user.role_id,
      role_libelle: rolesMap[user.role_id] || 'N/A',
      created_at: user.created_at
    }));

    return NextResponse.json({
      success: true,
      data: formattedUsers,
      count: formattedUsers.length
    });

  } catch (error) {
    console.error('Erreur GET /api/admin/users:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

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
export async function POST(request) {
  try {
    // Vérifier l'accès admin
    const adminCheck = await checkAdminAccess(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json({
        success: false,
        message: adminCheck.error || 'Accès refusé. Droits administrateur requis.'
      }, { status: 403 });
    }

    const { username, password, prenom, nom, role_id } = await request.json();

    // Validation des champs requis
    if (!username || !password) {
      return NextResponse.json({
        success: false,
        message: 'Username et mot de passe requis'
      }, { status: 400 });
    }

    // Validation du format du username avec politique stricte
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return NextResponse.json({
        success: false,
        message: usernameValidation.error
      }, { status: 400 });
    }

    // Validation du mot de passe avec politique de sécurité renforcée
    const passwordValidation = validatePassword(password, { username, prenom, nom });
    if (!passwordValidation.valid) {
      return NextResponse.json({
        success: false,
        message: 'Le mot de passe ne respecte pas la politique de sécurité',
        errors: passwordValidation.errors
      }, { status: 400 });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return NextResponse.json({
        success: false,
        message: 'Cet username est déjà utilisé'
      }, { status: 409 });
    }

    // Vérifier que le rôle existe si fourni
    if (role_id) {
      const role = await RoleEnum.findByPk(role_id);
      if (!role) {
        return NextResponse.json({
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
      first_login: true
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
      request,
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
      role_id: newUser.role_id,
      role_libelle: rolesMap[newUser.role_id] || 'N/A',
      first_login: newUser.first_login,
      created_at: newUser.created_at
    };

    return NextResponse.json({
      success: true,
      data: formattedUser,
      message: 'Utilisateur créé avec succès'
    }, { status: 201 });

  } catch (error) {
    console.error('Erreur POST /api/admin/users:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la création de l\'utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users
 * Supprimer un ou plusieurs utilisateurs (admin only)
 * Body:
 * - userIds: array of user IDs to delete
 */
export async function DELETE(request) {
  try {
    // Vérifier l'accès admin
    const adminCheck = await checkAdminAccess(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json({
        success: false,
        message: adminCheck.error || 'Accès refusé. Droits administrateur requis.'
      }, { status: 403 });
    }

    const { userIds } = await request.json();

    // Validation
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Liste d\'utilisateurs requise (userIds doit être un tableau non vide)'
      }, { status: 400 });
    }

    // Empêcher l'admin de se supprimer lui-même
    const currentUserId = adminCheck.userId;
    if (userIds.includes(currentUserId)) {
      return NextResponse.json({
        success: false,
        message: 'Vous ne pouvez pas supprimer votre propre compte'
      }, { status: 400 });
    }

    // Supprimer les utilisateurs
    const deletedCount = await User.destroy({
      where: {
        id_user: userIds
      }
    });

    if (deletedCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'Aucun utilisateur trouvé avec ces IDs'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `${deletedCount} utilisateur(s) supprimé(s) avec succès`,
      data: {
        deletedCount
      }
    });

  } catch (error) {
    console.error('Erreur DELETE /api/admin/users:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la suppression des utilisateurs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
