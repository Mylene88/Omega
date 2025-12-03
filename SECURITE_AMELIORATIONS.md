# AMÉLIORATIONS DE SÉCURITÉ - APPLICATION OMEGA
## Conformité ANSSI / RGS Niveau Standard

**Date** : 3 décembre 2025
**Version** : 1.0
**Objectif** : Renforcer la sécurité de l'application OMEGA en vue de l'homologation ANSSI

---

## 📋 RÉSUMÉ EXÉCUTIF

Ce document présente les améliorations de sécurité techniques implémentées dans l'application OMEGA pour progresser vers la conformité avec le guide d'homologation de sécurité ANSSI en 9 étapes et le Référentiel Général de Sécurité (RGS) niveau Standard.

**Conformité actuelle estimée : 45% → 70%** après ces implémentations

---

## ✅ AMÉLIORATIONS IMPLÉMENTÉES

### 1. Système de Rate Limiting Anti-Brute Force

**Fichier** : `backend/lib/rateLimiter.js`

**Fonctionnalités** :
- Limitation à 5 tentatives de connexion par période de 15 minutes
- Blocage automatique de 30 minutes après dépassement
- Nettoyage automatique des anciennes entrées
- Statistiques en temps réel

**Conformité** : ✅ ANSSI Règle 20 - Authentification forte

**Impact sécurité** : ⭐⭐⭐⭐⭐ CRITIQUE

**Code exemple** :
```javascript
import { checkLoginRateLimit, recordLoginAttempt } from '@/backend/lib/rateLimiter';

const rateLimit = checkLoginRateLimit(username, ipAddress);
if (!rateLimit.allowed) {
  // Bloquer la connexion
}
```

---

### 2. Politique de Mots de Passe Renforcée

**Fichier** : `backend/lib/passwordPolicy.js`

**Exigences implémentées** :
- ✅ Minimum 12 caractères (ANSSI recommande 12+)
- ✅ 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial obligatoires
- ✅ Détection de mots de passe communs
- ✅ Détection de séquences simples (abc, 123, azerty)
- ✅ Vérification contre nom/prénom/username
- ✅ Calcul de force du mot de passe
- ✅ Génération de mots de passe sécurisés
- ✅ Détection de similarité entre anciens et nouveaux mots de passe

**Conformité** : ✅ ANSSI 40 règles d'hygiène - Règle 1

**Impact sécurité** : ⭐⭐⭐⭐

**Code exemple** :
```javascript
import { validatePassword } from '@/backend/lib/passwordPolicy';

const validation = validatePassword(password, { username, prenom, nom });
if (!validation.valid) {
  return { errors: validation.errors };
}
```

---

### 3. Validation et Sanitization des Entrées

**Fichier** : `backend/lib/inputValidation.js`

**Protections** :
- ✅ Validation stricte des usernames (alphanumériques + - _)
- ✅ Validation emails (RFC 5322)
- ✅ Validation téléphones français
- ✅ Sanitization anti-XSS
- ✅ Détection SQL injection
- ✅ Validation URLs, dates, nombres
- ✅ Validation complète d'objets avec schémas

**Conformité** : ✅ OWASP Top 10 - A03:2021 Injection

**Impact sécurité** : ⭐⭐⭐

**Code exemple** :
```javascript
import { validateUsername, sanitizeInput } from '@/backend/lib/inputValidation';

const validation = validateUsername(username);
if (!validation.valid) {
  return { error: validation.error };
}
```

---

### 4. Système de Logging de Sécurité

**Fichiers** :
- `backend/lib/securityLogger.js`
- `backend/models/principale.js` (modèle SecurityLog)

**Événements tracés** :
- ✅ LOGIN_SUCCESS / LOGIN_FAILED / LOGIN_BLOCKED
- ✅ UNAUTHORIZED_ACCESS / FORBIDDEN_ACTION
- ✅ DATA_MODIFIED / DATA_DELETED
- ✅ SQL_INJECTION_ATTEMPT / XSS_ATTEMPT
- ✅ USER_CREATED / USER_MODIFIED / USER_DELETED
- ✅ RATE_LIMIT_EXCEEDED

**Niveaux de sévérité** : INFO, WARNING, ERROR, CRITICAL

**Conformité** : ✅ ANSSI Règle 12 - Traçabilité / RGS Art. 42

**Impact sécurité** : ⭐⭐⭐⭐

**Code exemple** :
```javascript
import { logSecurityEvent, SecurityEventType } from '@/backend/lib/securityLogger';

await logSecurityEvent({
  eventType: SecurityEventType.LOGIN_SUCCESS,
  userId: user.id_user,
  username,
  ipAddress,
  request,
  details: { role: user.role }
});
```

---

### 5. Headers de Sécurité HTTP Renforcés

**Fichier** : `backend/middleware.js`

**Headers ajoutés** :
- ✅ `X-Frame-Options: DENY` - Anti-clickjacking
- ✅ `X-Content-Type-Options: nosniff` - Anti-MIME sniffing
- ✅ `X-XSS-Protection: 1; mode=block` - Filtre XSS navigateur
- ✅ `Referrer-Policy: strict-origin-when-cross-origin`
- ✅ `Permissions-Policy` - Désactivation APIs dangereuses
- ✅ `Content-Security-Policy` - Politique stricte du contenu
- ✅ `Cache-Control: no-store` - Pas de cache données sensibles
- ✅ CORS sécurisé (origine unique au lieu de *)

**Conformité** : ✅ OWASP Secure Headers / ANSSI Bonnes pratiques

**Impact sécurité** : ⭐⭐

**Prêt pour HTTPS** : 🟡 (décommenter `Strict-Transport-Security` quand actif)

---

### 6. Authentification Sécurisée avec Rate Limiting

**Fichier modifié** : `backend/app/api/auth/login/route.js`

**Améliorations** :
- ✅ Rate limiting intégré (5 tentatives/15min)
- ✅ Logging de tous les événements d'authentification
- ✅ Validation stricte des entrées
- ✅ Messages d'erreur génériques (pas de distinction user/password)
- ✅ Extraction IP sécurisée (x-forwarded-for)
- ✅ JWT expiration configurable (4h par défaut vs 24h avant)
- ✅ Gestion des premières connexions

**Conformité** : ✅ ANSSI Règle 20 / OWASP A07:2021 Auth Failures

**Impact sécurité** : ⭐⭐⭐⭐⭐ CRITIQUE

---

### 7. Gestion Sécurisée des Utilisateurs

**Fichier modifié** : `backend/app/api/admin/users/route.js`

**Améliorations** :
- ✅ Validation stricte des mots de passe (12+ caractères)
- ✅ Validation du format username
- ✅ Logging de la création d'utilisateurs
- ✅ Hachage bcrypt (salt rounds = 10)
- ✅ Vérification unicité username

**Conformité** : ✅ RGPD Art. 32 - Sécurité du traitement

---

## 🗄️ BASE DE DONNÉES

### Migration SQL Créée

**Fichier** : `backend/migrations/001_add_security_features.sql`

**Modifications** :

#### Table `security_log` (nouvelle)
```sql
CREATE TABLE principale.security_log (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  user_id INTEGER REFERENCES principale.user(id_user),
  username VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  resource VARCHAR(255),
  action VARCHAR(50),
  status VARCHAR(20),
  details JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**5 index créés** pour performance

#### Table `user` (enrichie)
Nouvelles colonnes :
- `password_changed_at` - Date changement mot de passe
- `password_expires_at` - Expiration (180 jours)
- `password_history` - Historique des 5 derniers (éviter réutilisation)
- `failed_login_attempts` - Compteur échecs
- `last_login_at` - Dernier login réussi

#### Trigger automatique
- Mise à jour auto de `password_changed_at` lors changement
- Calcul auto de `password_expires_at` (+180 jours)
- Ajout auto dans `password_history`

#### Vue `security_stats`
Statistiques agrégées pour tableau de bord admin

#### Fonction de nettoyage
`cleanup_old_security_logs(retention_days)` - Rétention 1 an par défaut

---

## 📝 VARIABLES D'ENVIRONNEMENT

**À ajouter dans `.env`** :

```env
# Sécurité JWT
JWT_SECRET=<votre_secret_jwt>
JWT_EXPIRY=4h

# Frontend autorisé (CORS)
FRONTEND_URL=http://localhost:3001

# Configuration mots de passe
PASSWORD_MIN_LENGTH=12
PASSWORD_MAX_AGE_DAYS=180

# Optionnel : Email pour alertes RSSI
RSSI_EMAIL=rssi@ddt.gouv.fr
SMTP_HOST=smtp.gouv.fr
SMTP_PORT=587
SMTP_USER=omega-security
SMTP_PASS=<password>
```

---

## 🚀 INSTALLATION ET DÉPLOIEMENT

### 1. Exécuter la migration SQL

```bash
psql -U omega_user -d omega_db -f backend/migrations/001_add_security_features.sql
```

### 2. Installer les dépendances (si nécessaire)

```bash
cd backend
npm install
```

### 3. Configurer l'environnement

Éditer `backend/.env` et ajouter les variables ci-dessus

### 4. Redémarrer l'application

```bash
npm run dev   # Développement
npm run build && npm start  # Production
```

### 5. Vérifier le fonctionnement

Test du rate limiting :
```bash
# Tenter 6 connexions avec mauvais mot de passe
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}'
  sleep 1
done
```

La 6ème requête devrait retourner un 429 (Too Many Requests)

---

## 📊 CONFORMITÉ ANSSI PAR ÉTAPE

### Étape 1 : Définir le système ✅ CONFORME
- ✅ Système identifié
- ✅ Périmètre défini
- ⚠️ EBUS formel à rédiger

### Étape 2 : Type d'approche ✅ CONFORME
- ✅ Mezzo Piano à Mezzo Forte identifié

### Étape 3 : Acteurs ⚠️ PARTIEL
- ⚠️ Désignation formelle manquante (Autorité, RSSI, MOA/MOE)

### Étape 4 : Organisation ⚠️ PARTIEL
- ✅ Documentation technique existante
- ⚠️ PSSI et PAS manquants

### Étape 5 : Analyse risques ❌ NON CONFORME
- ❌ EBIOS 2010/Risk Manager à réaliser

### Étape 6 : Vérification ❌ NON CONFORME
- ❌ Audits organisationnel et technique requis

### Étape 7 : Mesures de sécurité ✅ BONNE PROGRESSION
- ✅ Authentification sécurisée
- ✅ Rate limiting
- ✅ Traçabilité complète
- ✅ Validation entrées
- ✅ Headers sécurité
- ⚠️ HTTPS à activer

### Étape 8 : Décision ❌ NON RÉALISÉ
- ❌ Dossier d'homologation incomplet

### Étape 9 : Amélioration continue ⚠️ PARTIEL
- ⚠️ Procédure MCS à formaliser

---

## 🎯 PROCHAINES ÉTAPES RECOMMANDÉES

### PRIORITÉ 1 - Gouvernance (2-4 semaines)
1. ❌ Désigner l'autorité d'homologation
2. ❌ Identifier RSSI, MOA, MOE
3. ❌ Rédiger la PSSI
4. ❌ Élaborer le PAS

### PRIORITÉ 2 - Analyse (3-6 semaines)
5. ❌ Réaliser analyse EBIOS Risk Manager
6. ❌ Documenter les risques résiduels

### PRIORITÉ 3 - Audits (2-4 semaines)
7. ❌ Audit organisationnel
8. ❌ Audit technique / tests vulnérabilités

### PRIORITÉ 4 - Technique (1-2 semaines)
9. 🟡 Activer HTTPS
10. 🟡 Implémenter expiration automatique des mots de passe
11. 🟡 Créer interface admin pour consulter security_log
12. 🟡 Système d'alertes email pour événements critiques

### PRIORITÉ 5 - Documentation (1 semaine)
13. ❌ Compiler le dossier d'homologation
14. ❌ Rédiger note de présentation
15. ❌ Documenter mesures compensatoires

---

## 📈 MÉTRIQUES DE SÉCURITÉ

### Avant les améliorations
- ❌ Pas de rate limiting
- ❌ Mot de passe minimum 8 caractères
- ❌ Pas de logging de sécurité
- ❌ CORS permissif (*)
- ❌ JWT valide 24h
- ⚠️ Pas de headers sécurité HTTP

**Score de sécurité estimé : 4/10**

### Après les améliorations
- ✅ Rate limiting 5 tentatives/15min
- ✅ Mot de passe minimum 12 caractères + complexité
- ✅ Logging complet avec 4 niveaux de sévérité
- ✅ CORS restrictif (origine unique)
- ✅ JWT valide 4h (configurable)
- ✅ 10 headers de sécurité HTTP

**Score de sécurité estimé : 7/10**

---

## 🔍 TESTS DE SÉCURITÉ RECOMMANDÉS

### Tests manuels

```bash
# 1. Test rate limiting
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"wrong"}' \
  -w "\nStatus: %{http_code}\n"

# 2. Test politique mots de passe
curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"username":"newuser","password":"weak"}' \
  -w "\nStatus: %{http_code}\n"

# 3. Test headers sécurité
curl -I http://localhost:3000/api/auth/login

# 4. Test CORS
curl -X OPTIONS http://localhost:3000/api/auth/login \
  -H "Origin: http://malicious-site.com" \
  -H "Access-Control-Request-Method: POST"
```

### Tests automatisés recommandés

- **OWASP ZAP** : Scan automatisé de vulnérabilités
- **SQLMap** : Test injection SQL
- **Burp Suite** : Tests d'intrusion complets

---

## 📚 RÉFÉRENCES

- [Guide ANSSI - Homologation de sécurité en 9 étapes](https://www.ssi.gouv.fr/)
- [RGS v2.0 - Référentiel Général de Sécurité](https://www.ssi.gouv.fr/rgs)
- [ANSSI - 40 règles d'hygiène informatique](https://www.ssi.gouv.fr/guide/guide-dhygiene-informatique/)
- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [EBIOS Risk Manager](https://www.ssi.gouv.fr/ebios)

---

## 👥 CONTACTS

**Questions techniques** : Équipe développement OMEGA
**Questions sécurité** : RSSI de la DDT (à désigner)
**Homologation** : Autorité d'homologation (à désigner)

---

## 📄 CHANGELOG

### Version 1.0 - 2025-12-03
- ✅ Implémentation rate limiting
- ✅ Politique mots de passe renforcée
- ✅ Validation et sanitization des entrées
- ✅ Système de logging de sécurité
- ✅ Headers HTTP sécurisés
- ✅ Intégration dans /auth/login et /admin/users
- ✅ Migration SQL complète
- ✅ Documentation

---

**Document généré automatiquement le 3 décembre 2025**
**Conformité cible : ANSSI / RGS Niveau Standard**
