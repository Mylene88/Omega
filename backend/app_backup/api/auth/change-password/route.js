// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic';

//backend/app_backup/api/auth/change-password/route.js

import { NextResponse } from 'next/server';
import db from '@/backend/models';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { successResponse, errorResponse } from '@/backend/utils/response';
import { withTransaction } from '@/backend/utils/database';

const { User } = db;

// Fonction de génération de mot de passe sécurisé
function generateSecurePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  const length = 12;
  let password = '';

  // Au moins une majuscule, une minuscule, un chiffre et un caractère spécial
  password += 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 25)];
  password += 'abcdefghijkmnpqrstuvwxyz'[Math.floor(Math.random() * 25)];
  password += '23456789'[Math.floor(Math.random() * 8)];
  password += '!@#$%&*'[Math.floor(Math.random() * 7)];

  // Compléter avec des caractères aléatoires
  for (let i = 4; i < length; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }

  // Mélanger la chaîne
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

// POST - Changer le mot de passe lors de la première connexion
export async function POST(request) {
  try {
    const { token, newPassword, useGeneratedPassword } = await request.json();

    if (!token) {
      const { body, status } = errorResponse('Token requis', 400);
      return NextResponse.json(body, { status });
    }

    // Vérifier le token
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId;
    } catch (error) {
      const { body, status } = errorResponse('Token invalide ou expiré', 401);
      return NextResponse.json(body, { status });
    }

    const result = await withTransaction(async (transaction) => {
      // Récupérer l'utilisateur
      const user = await User.findByPk(userId, { transaction });

      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      if (!user.first_login) {
        throw new Error('Changement de mot de passe non requis');
      }

      let finalPassword = newPassword;

      // Générer un mot de passe si demandé
      if (useGeneratedPassword) {
        finalPassword = generateSecurePassword();
      }

      if (!finalPassword || finalPassword.length < 8) {
        throw new Error('Le mot de passe doit contenir au moins 8 caractères');
      }

      // Validation des critères de mot de passe
      const passwordRegex = {
        minLength: finalPassword.length >= 8,
        hasUppercase: /[A-Z]/.test(finalPassword),
        hasLowercase: /[a-z]/.test(finalPassword),
        hasNumber: /\d/.test(finalPassword),
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(finalPassword)
      };

      if (!Object.values(passwordRegex).every(Boolean)) {
        throw new Error('Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial');
      }

      // Hasher le nouveau mot de passe
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(finalPassword, saltRounds);

      // Mettre à jour l'utilisateur
      await user.update({
        password_hash: hashedPassword,
        first_login: false
      }, { transaction });

      return {
        user,
        generatedPassword: useGeneratedPassword ? finalPassword : null
      };
    });

    const { body, status } = successResponse({
      message: 'Mot de passe changé avec succès',
      user: {
        id_user: result.user.id_user,
        username: result.user.username,
        prenom: result.user.prenom,
        nom: result.user.nom,
        nom_complet: result.user.prenom && result.user.nom
          ? `${result.user.prenom} ${result.user.nom}`
          : result.user.username,
        first_login: false,
        role_id: result.user.role_id
      },
      generatedPassword: result.generatedPassword
    });

    return NextResponse.json(body, { status });

  } catch (error) {
    console.error('Erreur changement mot de passe:', error);

    let statusCode = 500;
    let message = error.message || 'Erreur lors du changement de mot de passe';

    if (error.message === 'Utilisateur non trouvé') {
      statusCode = 404;
    } else if (error.message === 'Changement de mot de passe non requis') {
      statusCode = 400;
    } else if (error.message.includes('mot de passe')) {
      statusCode = 400;
    }

    const { body, status } = errorResponse(message, statusCode);
    return NextResponse.json(body, { status });
  }
}

// GET - Générer un mot de passe suggéré
export async function GET() {
  try {
    const generatedPassword = generateSecurePassword();

    const { body, status } = successResponse({
      suggested_password: generatedPassword,
      password_rules: {
        min_length: 8,
        requires_uppercase: true,
        requires_lowercase: true,
        requires_number: true,
        requires_special_char: true,
        special_chars_allowed: '!@#$%^&*(),.?":{}|<>'
      }
    });

    return NextResponse.json(body, { status });
  } catch (error) {
    const { body, status } = errorResponse(
      'Erreur lors de la génération du mot de passe',
      500
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
