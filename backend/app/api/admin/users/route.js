// backend/app/api/admin/users/route.js

import { NextResponse } from 'next/server';
import db from '@/backend/models';
import { checkAdminAccess } from '@/backend/lib/adminAuthHelper';

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

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
