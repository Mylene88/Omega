# Guide de Build Production - Application OMEGA

## 📋 Vue d'ensemble

Ce guide explique **TOUS** les éléments à vérifier et modifier avant de builder l'application OMEGA pour la production.

---

## ⚠️ PROBLÈMES CRITIQUES IDENTIFIÉS

### 🔴 1. URLs hardcodées dans le frontend (30+ occurrences)

**Problème** : Le frontend contient plus de 30 appels API avec `http://localhost:3000` en dur.

**Impact** : En production, ces appels échoueront car le backend ne sera pas sur `localhost:3000`.

**Fichiers concernés** :
- `frontend/src/vizualisation/api/api.js` (4 occurrences)
- `frontend/src/vizualisation/pages/ListeProjetPage.js` (3 occurrences)
- `frontend/src/vizualisation/components/MapView.js` (2 occurrences)
- `frontend/src/vizualisation/components/MapFilters.js` (3 occurrences)
- `frontend/src/vizualisation/components/VueListe.js` (2 occurrences)
- `frontend/src/pages/Admin/AdminPageEnhanced.js` (4 occurrences)
- `frontend/src/pages/FormulairePage.js` (3 occurrences)
- Et 15+ autres fichiers...

### 🔴 2. Configuration CORS hardcodée dans le backend

**Problème** : Le backend n'accepte que les requêtes depuis `http://localhost:3001`.

**Fichier** : `backend/next.config.js` ligne 18

```javascript
{ key: 'Access-Control-Allow-Origin', value: 'http://localhost:3001' }
```

---

## ✅ SOLUTION : Variables d'environnement

### Étape 1 : Créer les fichiers d'environnement

#### **Frontend : `.env.production`**

Créer le fichier `frontend/.env.production` :

```bash
# URL de l'API backend
REACT_APP_API_URL=http://votre-serveur-prod:3000

# Mode des tuiles cartographiques (local pour environnement cloisonné DDT)
REACT_APP_TILE_MODE=local

# URL du frontend (pour référence)
PUBLIC_URL=http://votre-serveur-prod:3001
```

#### **Backend : `.env.production`**

Créer le fichier `backend/.env.production` :

```bash
# URL du frontend (pour CORS)
FRONTEND_URL=http://votre-serveur-prod:3001

# Base de données PostgreSQL
POSTGRES_DB=omega
POSTGRES_USR=postgres
POSTGRES_PWD=votre_mot_de_passe_securise
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# JWT Configuration
JWT_SECRET=votre_secret_jwt_ultra_securise
JWT_EXPIRY=4h

# Mode Node.js
NODE_ENV=production
```

### Étape 2 : Modifier le code pour utiliser les variables d'environnement

#### 📁 `frontend/src/config/apiConfig.js` (À CRÉER)

Créer ce nouveau fichier :

```javascript
// frontend/src/config/apiConfig.js
/**
 * Configuration centralisée de l'API
 * Utilise les variables d'environnement pour la production
 */

// URL de l'API backend
// En développement : localhost:3000
// En production : variable REACT_APP_API_URL depuis .env.developpement.developpement.production
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Fonction helper pour construire les URLs d'API
export const buildApiUrl = (endpoint) => {
  // Assurer que l'endpoint commence par /
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};

// Export par défaut
export default {
  API_BASE_URL,
  buildApiUrl
};
```

#### 📝 Remplacer toutes les URLs hardcodées

**AVANT** (exemple dans `frontend/src/vizualisation/api/api.js`) :
```javascript
const API_BASE_URL = 'http://localhost:3000';
const res = await fetch(`${API_BASE_URL}/api/projet-geometry`, { ... });
```

**APRÈS** :
```javascript
import { API_BASE_URL } from '../../config/apiConfig';
const res = await fetch(`${API_BASE_URL}/api/projet-geometry`, { ... });
```

#### 📝 Modifier `backend/next.config.js`

**AVANT** :
```javascript
{ key: 'Access-Control-Allow-Origin', value: 'http://localhost:3001' }
```

**APRÈS** :
```javascript
{
  key: 'Access-Control-Allow-Origin',
  value: process.env.FRONTEND_URL || 'http://localhost:3001'
}
```

---

## 📦 ÉTAPES DE BUILD

### 🏗️ BUILD BACKEND

```bash
cd backend

# 1. Installer les dépendances de production
npm ci --production=false

# 2. Build Next.js
npm run build

# 3. Tester le build localement (optionnel)
npm run start

# Le backend sera disponible sur http://localhost:3000
```

**Résultat** : Dossier `.next/` créé avec l'application optimisée

### 🎨 BUILD FRONTEND

```bash
cd frontend

# 1. Installer les dépendances
npm ci

# 2. Build React pour la production
npm run build

# Le build sera dans le dossier 'build/'
```

**Résultat** : Dossier `build/` créé avec les fichiers statiques optimisés

---

## 🚀 DÉPLOIEMENT

### Option 1 : Serveur traditionnel (Nginx + Node.js)

#### Configuration Nginx

```nginx
# Frontend (fichiers statiques React)
server {
    listen 3001;
    server_name votre-serveur;

    root /chemin/vers/Omega-fix/frontend/build;
    index index.html;

    # Servir les fichiers statiques
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy vers le backend pour les appels API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Servir les tuiles cartographiques locales
    location /tiles/ {
        root /chemin/vers/Omega-fix/public;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Démarrer le backend avec PM2

```bash
# Installer PM2 globalement
npm install -g pm2

# Démarrer le backend
cd /chemin/vers/Omega-fix/backend
pm2 start npm --name "omega-backend" -- start

# Sauvegarder la configuration PM2
pm2 save
pm2 startup
```

### Option 2 : Docker (Recommandé)

Créer les fichiers Docker (à venir si demandé)

---

## 🔧 CONFIGURATION POSTGRESQL

### Avant le premier démarrage en production

```bash
# 1. Créer la base de données
psql -U postgres
CREATE DATABASE omega;
CREATE USER omega_user WITH PASSWORD 'mot_de_passe_securise';
GRANT ALL PRIVILEGES ON DATABASE omega TO omega_user;
\q

# 2. Exécuter les migrations
cd /chemin/vers/Omega-fix/backend
node scripts/run-migration.js

# 3. Vérifier la connexion
psql -h localhost -U omega_user -d omega
```

---

## 🗺️ TUILES CARTOGRAPHIQUES (Environnement cloisonné)

### Télécharger les tuiles localement

Conformément au cahier des charges (environnement cloisonné ANSSI), télécharger les tuiles :

```bash
# Créer le répertoire des tuiles
mkdir -p frontend/public/tiles/{plan,ortho}

# Télécharger les tuiles pour Eure-et-Loir (zoom 8-14)
# Script Python disponible dans le projet
python backend/scripts/download-tiles.py --zone eure-et-loir
```

**Configuration** : Définir `REACT_APP_TILE_MODE=local` dans `.env.production`

---

## ✅ CHECKLIST PRE-BUILD

### Backend

- [ ] Fichier `.env.production` créé avec les bonnes valeurs
- [ ] Variable `FRONTEND_URL` configurée dans `next.config.js`
- [ ] Variable `JWT_SECRET` changée (différente du dev)
- [ ] Credentials PostgreSQL de production configurés
- [ ] `NODE_ENV=production` défini

### Frontend

- [ ] Fichier `.env.production` créé
- [ ] Fichier `frontend/src/config/apiConfig.js` créé
- [ ] Toutes les URLs `localhost:3000` remplacées par import de `apiConfig.js`
- [ ] Variable `REACT_APP_TILE_MODE=local` si environnement cloisonné
- [ ] Tuiles cartographiques téléchargées dans `public/tiles/`

### Base de données

- [ ] PostgreSQL installé et démarré
- [ ] Base de données `omega` créée
- [ ] Utilisateur PostgreSQL créé avec les bons droits
- [ ] Migrations exécutées
- [ ] Backup automatique configuré (voir `backend/scripts/SETUP_BACKUP_CRON.md`)

### Sécurité

- [ ] Fichiers `.env` ajoutés au `.gitignore` (CRITIQUE)
- [ ] Mot de passe PostgreSQL sécurisé (16+ caractères)
- [ ] JWT_SECRET changé et sécurisé (32+ caractères)
- [ ] Firewall configuré (ports 3000 et 3001 seulement)
- [ ] HTTPS configuré si accessible depuis l'extérieur

---

## 🐛 DÉPANNAGE

### Le frontend ne peut pas joindre le backend

```bash
# Vérifier que le backend est démarré
curl http://localhost:3000/api/health

# Vérifier les logs
pm2 logs omega-backend
```

### Erreur CORS

```bash
# Vérifier la variable FRONTEND_URL dans backend/.env.developpement.developpement.production
cat backend/.env.developpement.developpement.production | grep FRONTEND_URL

# Doit correspondre à l'URL du frontend
```

### Les tuiles cartographiques ne s'affichent pas

```bash
# Vérifier que les tuiles sont présentes
ls -la frontend/public/tiles/plan/
ls -la frontend/public/tiles/ortho/

# Vérifier la configuration
cat frontend/.env.developpement.developpement.production | grep TILE_MODE
# Doit être: REACT_APP_TILE_MODE=local
```

---

## 📞 SUPPORT

Pour toute question, consulter :
- `backend/scripts/SETUP_BACKUP_CRON.md` : Configuration des sauvegardes
- `Cahier_des_charges_OPTIMISE.md` : Spécifications complètes
- Logs du backend : `pm2 logs omega-backend`
- Logs Nginx : `/var/log/nginx/error.log`

---

## 🔄 MISES À JOUR

Pour déployer une nouvelle version :

```bash
# 1. Arrêter le backend
pm2 stop omega-backend

# 2. Pull les changements
git pull origin main

# 3. Rebuild backend
cd backend
npm ci
npm run build

# 4. Rebuild frontend
cd ../frontend
npm ci
npm run build

# 5. Redémarrer le backend
pm2 restart omega-backend

# 6. Recharger Nginx
sudo nginx -s reload
```

---

**Date de création** : 4 décembre 2025
**Version** : 1.0
**Auteur** : Documentation automatique OMEGA
