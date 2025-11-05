// backend/app/api/auth/login/route.js

import { NextResponse } from 'next/server';
import db from '@/backend/models';  
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { successResponse, errorResponse } from '@/backend/utils/response'; 

const { User, RoleEnum } = db;

// POST - Authentification utilisateur
export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      const { body, status } = errorResponse('Username et mot de passe requis', 400);
      return NextResponse.json(body, { status });
    }

    // Rechercher l'utilisateur par username
    const user = await User.findOne({
      where: { username },
      include: [
        {
          model: RoleEnum,
          as: 'role_enum',
          attributes: ['id_role', 'libelle']
        }
      ]
    });

    if (!user) {
      const { body, status } = errorResponse('Utilisateur non trouvé', 401);
      return NextResponse.json(body, { status });
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      const { body, status } = errorResponse('Mot de passe incorrect', 401);
      return NextResponse.json(body, { status });
    }

    // Vérifier que JWT_SECRET est défini
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET non défini dans .env');
      const { body, status } = errorResponse('Erreur de configuration serveur', 500);
      return NextResponse.json(body, { status });
    }

    // Générer le token JWT
    const token = jwt.sign(
      {
        userId: user.id_user,
        username: user.username,
        roleId: user.role_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Préparer les données utilisateur (sans le mot de passe)
    const userData = {
      id_user: user.id_user,
      username: user.username,
      prenom: user.prenom,
      nom: user.nom,
      nom_complet: user.prenom && user.nom ? `${user.prenom} ${user.nom}` : user.username,
      first_login: user.first_login,
      role_id: user.role_id,
      role: user.role_enum ? {
        id_role: user.role_enum.id_role,
        libelle: user.role_enum.libelle
      } : null,
      created_at: user.created_at
    };

    const { body, status } = successResponse({
      token,
      user: userData,
      message: user.first_login
        ? 'Première connexion - changement de mot de passe requis'
        : 'Connexion réussie'
    });

    return NextResponse.json(body, { status });

  } catch (error) {
    console.error('Erreur login:', error);
    const { body, status } = errorResponse(
      'Erreur lors de la connexion', 
      500, 
      error.message
    );
    return NextResponse.json(body, { status });
  }
}

// OPTIONS - Support CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
