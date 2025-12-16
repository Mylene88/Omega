// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic';

// backend/app/api/admin/users/[id]/route.js

import { NextResponse } from 'next/server';
import db from '@/backend/models';
import bcrypt from 'bcryptjs';
import { checkAdminAccess } from '@/backend/lib/adminAuthHelper';

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
export async function PUT(request, { params }) {
  try {
    // Vérifier l'accès admin
    const adminCheck = await checkAdminAccess(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json({
        success: false,
        message: adminCheck.error || 'Accès refusé. Droits administrateur requis.'
      }, { status: 403 });
    }

    const userId = parseInt(params.id);

    if (isNaN(userId)) {
      return NextResponse.json({
        success: false,
        message: 'ID utilisateur invalide'
      }, { status: 400 });
    }

    const { prenom, nom, role_id, password, first_login } = await request.json();

    // Vérifier que l'utilisateur existe
    const user = await User.findByPk(userId);
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'Utilisateur non trouvé'
      }, { status: 404 });
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

    // Préparer les données de mise à jour
    const updateData = {};

    if (prenom !== undefined) updateData.prenom = prenom;
    if (nom !== undefined) updateData.nom = nom;
    if (role_id !== undefined) updateData.role_id = role_id;
    if (first_login !== undefined) updateData.first_login = first_login;

    // Hasher le nouveau mot de passe si fourni
    if (password) {
      if (password.length < 8) {
        return NextResponse.json({
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

    return NextResponse.json({
      success: true,
      data: formattedUser,
      message: 'Utilisateur modifié avec succès'
    });

  } catch (error) {
    console.error('Erreur PUT /api/admin/users/:id:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la modification de l\'utilisateur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
