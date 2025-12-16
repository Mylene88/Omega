// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic';

// backend/app/api/auth/login/route.js

import { NextResponse } from 'next/server';
import db from '@/backend/models';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { successResponse, errorResponse } from '@/backend/utils/response';
import { checkLoginRateLimit, recordLoginAttempt } from '@/backend/lib/rateLimiter';
import { logSecurityEvent, SecurityEventType } from '@/backend/lib/securityLogger';
import { validateUsername } from '@/backend/lib/inputValidation';

const { User, RoleEnum } = db;

// Durée de validité JWT configurée (4h par défaut, ajustable)
const JWT_EXPIRY = process.env.JWT_EXPIRY || '4h';

// POST - Authentification utilisateur avec sécurité renforcée
export async function POST(request) {
  let username;
  let ipAddress;

  try {
    const { username: rawUsername, password } = await request.json();

    // Extraire l'IP du client
    ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                request.headers.get('x-real-ip') ||
                'unknown';

    // Validation basique des entrées
    if (!rawUsername || !password) {
      const { body, status } = errorResponse('Username et mot de passe requis', 400);
      return NextResponse.json(body, { status });
    }

    // Valider le format du username
    const usernameValidation = validateUsername(rawUsername);
    if (!usernameValidation.valid) {
      await logSecurityEvent({
        eventType: SecurityEventType.INVALID_INPUT,
        username: rawUsername,
        ipAddress,
        request,
        details: { error: usernameValidation.error, field: 'username' }
      });

      const { body, status } = errorResponse(usernameValidation.error, 400);
      return NextResponse.json(body, { status });
    }

    username = rawUsername;

    // === ÉTAPE 1: Vérifier le rate limiting ===
    const rateLimit = checkLoginRateLimit(username, ipAddress);

    if (!rateLimit.allowed) {
      // Enregistrer la tentative bloquée
      await logSecurityEvent({
        eventType: rateLimit.reason === 'BLOCKED'
          ? SecurityEventType.LOGIN_BLOCKED
          : SecurityEventType.RATE_LIMIT_EXCEEDED,
        username,
        ipAddress,
        request,
        details: {
          reason: rateLimit.reason,
          retryAfter: rateLimit.retryAfter
        }
      });

      const { body, status } = errorResponse(
        `Trop de tentatives de connexion. Veuillez réessayer dans ${Math.ceil(rateLimit.retryAfter / 60)} minutes.`,
        429
      );
      return NextResponse.json(body, {
        status,
        headers: {
          'Retry-After': String(rateLimit.retryAfter)
        }
      });
    }

    // === ÉTAPE 2: Rechercher l'utilisateur ===
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
      // Enregistrer l'échec (utilisateur inexistant)
      recordLoginAttempt(username, ipAddress, false);

      await logSecurityEvent({
        eventType: SecurityEventType.LOGIN_FAILED,
        username,
        ipAddress,
        request,
        details: { reason: 'User not found' }
      });

      const { body, status } = errorResponse('Identifiants incorrects', 401);
      return NextResponse.json(body, { status });
    }

    // === ÉTAPE 3: Vérifier le mot de passe ===
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      // Enregistrer l'échec (mot de passe incorrect)
      recordLoginAttempt(username, ipAddress, false);

      await logSecurityEvent({
        eventType: SecurityEventType.LOGIN_FAILED,
        userId: user.id_user,
        username,
        ipAddress,
        request,
        details: { reason: 'Invalid password' }
      });

      const { body, status } = errorResponse('Identifiants incorrects', 401);
      return NextResponse.json(body, { status });
    }

    // === ÉTAPE 4: Vérifier la configuration JWT ===
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET non défini dans .env');
      const { body, status } = errorResponse('Erreur de configuration serveur', 500);
      return NextResponse.json(body, { status });
    }

    // === ÉTAPE 5: Connexion réussie ===
    // Reset le rate limiter pour cet utilisateur
    recordLoginAttempt(username, ipAddress, true);

    // Générer le token JWT avec expiration configurée
    const token = jwt.sign(
      {
        userId: user.id_user,
        username: user.username,
        roleId: user.role_id
      },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
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

    // Logger le succès de connexion
    await logSecurityEvent({
      eventType: user.first_login ? SecurityEventType.FIRST_LOGIN : SecurityEventType.LOGIN_SUCCESS,
      userId: user.id_user,
      username,
      ipAddress,
      request,
      details: {
        role: user.role_enum?.libelle,
        firstLogin: user.first_login
      }
    });

    const { body, status } = successResponse({
      token,
      user: userData,
      message: user.first_login
        ? 'Première connexion - changement de mot de passe requis'
        : 'Connexion réussie'
    });

    return NextResponse.json(body, { status });

  } catch (error) {
    console.error('❌ Erreur login:', error);

    // Logger l'erreur système
    if (username) {
      await logSecurityEvent({
        eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
        username,
        ipAddress,
        details: {
          error: error.message,
          type: 'System error during login'
        }
      }).catch(err => console.error('Erreur logging:', err));
    }

    const { body, status } = errorResponse(
      'Erreur lors de la connexion',
      500,
      error.message
    );
    return NextResponse.json(body, { status });
  }
}

// OPTIONS - Support CORS (géré par middleware.js)
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
