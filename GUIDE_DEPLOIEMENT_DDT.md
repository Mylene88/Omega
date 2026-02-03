# 📘 GUIDE DE DÉPLOIEMENT COMPLET - OMEGA DDT

**Version:** 1.0
**Date:** 16 Décembre 2024
**Environnement cible:** Serveur WAMP DDT Eure-et-Loir (Node 16.2.0)
**Auteur:** Documentation technique Omega

---

## 📑 TABLE DES MATIÈRES

1. [Prérequis](#1-prérequis)
2. [Phase 1 : Préparation sur PC de développement](#2-phase-1--préparation-sur-pc-de-développement)
   - 2.1. [Vérification de l'environnement](#21-vérification-de-lenvironnement)
   - 2.2. [Configuration des packages pour Node 16.2.0](#22-configuration-des-packages-pour-node-1620)
   - 2.3. [Téléchargement des tuiles IGN](#23-téléchargement-des-tuiles-ign)
   - 2.4. [Build du Frontend](#24-build-du-frontend)
   - 2.5. [Préparation du Backend](#25-préparation-du-backend)
   - 2.6. [Création du package de déploiement](#26-création-du-package-de-déploiement)
3. [Phase 2 : Transfert vers le serveur DDT](#3-phase-2--transfert-vers-le-serveur-ddt)
4. [Phase 3 : Installation sur le serveur WAMP](#4-phase-3--installation-sur-le-serveur-wamp)
   - 4.1. [Installation de Node.js](#41-installation-de-nodejs)
   - 4.2. [Déploiement du Backend](#42-déploiement-du-backend)
   - 4.3. [Déploiement du Frontend](#43-déploiement-du-frontend)
   - 4.4. [Configuration d'Apache](#44-configuration-dapache)
5. [Phase 4 : Configuration réseau et sécurité](#5-phase-4--configuration-réseau-et-sécurité)
6. [Phase 5 : Tests et validation](#6-phase-5--tests-et-validation)
7. [Maintenance et gestion](#7-maintenance-et-gestion)
8. [Dépannage](#8-dépannage)
9. [Annexes](#9-annexes)

---

## 1. PRÉREQUIS

### Sur le PC de développement

- ✅ Node.js installé (version actuelle : 24.x)
- ✅ npm installé
- ✅ Git installé
- ✅ Accès au code source Omega dans `/Users/mylene/Developer/Omega-fix`
- ✅ Clé USB formatée en NTFS (minimum 2 GB d'espace libre)
- ✅ Connexion internet (pour télécharger les tuiles IGN)
- ✅ Python 3.14 avec venv (pour le script de téléchargement des tuiles)

### Sur le serveur DDT

- ✅ Windows Server (2016/2019/2022)
- ✅ WAMP installé et fonctionnel
- ✅ PostgreSQL installé avec la base de données `omega`
- ✅ Accès administrateur au serveur
- ✅ IP statique : `10.28.8.236`
- ✅ Ports disponibles : 80 (Apache), 3000 (Node.js), 5432 (PostgreSQL)
- ✅ VEEAM configuré pour les sauvegardes
- ✅ Minimum 5 GB d'espace disque libre

### Informations réseau

- **Serveur IP:** `10.28.8.236`
- **Réseau DDT:** `10.28.8.0/24`
- **Nom de domaine interne (optionnel):** `omega.ddt-eure-et-loir.local`

---

## 2. PHASE 1 : PRÉPARATION SUR PC DE DÉVELOPPEMENT

### 2.1. Vérification de l'environnement

#### Étape 1.1 : Vérifier Node.js et npm

Ouvrir un terminal et exécuter :

```bash
node --version
npm --version
```

**Sortie attendue :**
```
v24.1.0 (ou version similaire)
11.6.0 (ou version similaire)
```

#### Étape 1.2 : Vérifier l'accès au projet

```bash
cd /Users/mylene/Developer/Omega-fix
ls -la
```

**Sortie attendue :** Vous devez voir les dossiers `backend/`, `frontend/`, et `donnees/`

#### Étape 1.3 : Vérifier l'état Git

```bash
git status
git branch
```

**Assurez-vous d'être sur la branche correcte** (ex: `omega-fix` ou `main`)

---

### 2.2. Configuration des packages pour Node 16.2.0

Les packages ont déjà été downgradés pour être compatibles avec Node 16.2.0. Vérifiez les versions :

#### Étape 2.1 : Vérifier le Backend

```bash
cd backend
cat package.json | grep -A 15 '"dependencies"'
```

**Versions attendues :**
- `next`: `13.5.6`
- `react`: `18.3.1`
- `react-dom`: `18.3.1`

#### Étape 2.2 : Vérifier le Frontend

```bash
cd ../frontend
cat package.json | grep -A 20 '"dependencies"'
```

**Versions attendues :**
- `react`: `^18.3.1`
- `react-dom`: `^18.3.1`
- `react-scripts`: `^5.0.1`

#### Étape 2.3 : Réinstaller les dépendances (si nécessaire)

Si les versions ne correspondent pas, réinstaller :

```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd ../frontend
rm -rf node_modules package-lock.json
npm install
```

---

### 2.3. Téléchargement des tuiles IGN

Les tuiles IGN sont essentielles pour le mode hors-ligne. Cette étape télécharge ~13,000 tuiles (352 MB).

#### Étape 3.1 : Activer l'environnement Python

```bash
cd /Users/mylene/Developer/Omega-fix/donnees
source venv/bin/activate
```

**Sortie attendue :** Le prompt change pour montrer `(venv)`

#### Étape 3.2 : Vérifier les dépendances Python

```bash
python3 -c "import requests; print('✓ requests installé')"
```

**Sortie attendue :** `✓ requests installé`

Si erreur, installer :
```bash
pip install requests
```

#### Étape 3.3 : Supprimer les tuiles vides existantes

```bash
# Vérifier les fichiers vides
find ../frontend/public/tiles -type f -size 0 | wc -l

# Supprimer les fichiers vides
find ../frontend/public/tiles/plan -type f -size 0 -delete
find ../frontend/public/tiles/ortho -type f -size 0 -delete

echo "✓ Fichiers vides supprimés"
```

#### Étape 3.4 : Télécharger les tuiles Plan (IGN)

```bash
echo "o" | python3 download_tiles.py plan
```

**Durée estimée :** 10-20 minutes
**Progression affichée :**
```
📥 Téléchargement des tuiles plan...
Zone: Eure-et-Loir (47.95, 0.45) -> (48.95, 1.99)
Zoom: 8 à 14
Format: png

📊 Estimation des tuiles:
  Zoom 8: 6 tuiles (2 x 3)
  Zoom 9: 12 tuiles (3 x 4)
  Zoom 10: 30 tuiles (5 x 6)
  Zoom 11: 100 tuiles (10 x 10)
  Zoom 12: 324 tuiles (18 x 18)
  Zoom 13: 1260 tuiles (36 x 35)
  Zoom 14: 4899 tuiles (71 x 69)

Total estimé: 6631 tuiles par couche

🚀 Téléchargement de 6631 tuiles avec 4 workers...
Progression: 100/6631 (1.5%)
Progression: 200/6631 (3.0%)
...
Progression: 6600/6631 (99.5%)

✅ Téléchargement terminé! 6631 tuiles traitées.
```

#### Étape 3.5 : Télécharger les tuiles Ortho (Satellite)

```bash
echo "o" | python3 download_tiles.py ortho
```

**Durée estimée :** 10-20 minutes
**Sortie similaire à l'étape 3.4**

#### Étape 3.6 : Vérifier les tuiles téléchargées

```bash
# Vérifier les tuiles Plan
echo "=== Tuiles Plan ===="
find ../frontend/public/tiles/plan -type f -size +1k | wc -l
du -sh ../frontend/public/tiles/plan

# Vérifier les tuiles Ortho
echo "=== Tuiles Ortho ===="
find ../frontend/public/tiles/ortho -type f -size +1k | wc -l
du -sh ../frontend/public/tiles/ortho

# Total
echo "=== Total ===="
du -sh ../frontend/public/tiles
```

**Sortie attendue :**
```
=== Tuiles Plan ====
6631
266M	frontend/public/tiles/plan

=== Tuiles Ortho ====
6631
 85M	frontend/public/tiles/ortho

=== Total ====
352M	frontend/public/tiles
```

#### Étape 3.7 : Désactiver l'environnement Python

```bash
deactivate
```

---

### 2.4. Build du Frontend

Le frontend React doit être compilé en fichiers statiques.

#### Étape 4.1 : Naviguer vers le frontend

```bash
cd /Users/mylene/Developer/Omega-fix/frontend
```

#### Étape 4.2 : Vérifier le fichier .env

```bash
cat .env.developpement.developpement
```

**Contenu attendu :**
```env
PORT=3001
DANGEROUSLY_DISABLE_HOST_CHECK=true
GENERATE_SOURCEMAP=false

# Mode tuiles : 'local' pour le mode hors-ligne
REACT_APP_TILE_MODE=local
```

#### Étape 4.3 : Lancer le build

```bash
npm run build
```

**Durée estimée :** 2-5 minutes

**Sortie attendue (fin du build) :**
```
Creating an optimized production build...
Compiled successfully.

File sizes after gzip:

  233.78 kB  build/static/js/main.1ea94fe7.js
  26.97 kB   build/static/css/main.4027d20b.css

The build folder is ready to be deployed.
```

#### Étape 4.4 : Vérifier le build

```bash
# Vérifier que le dossier build existe
ls -lh build/

# Vérifier que les tuiles sont incluses
ls -lh build/tiles/
du -sh build/tiles/
```

**Sortie attendue :**
```
total 24
drwxr-xr-x  5 mylene  staff   160B Dec 16 04:00 static
-rw-r--r--  1 mylene  staff   3.2K Dec 16 04:00 index.html
drwxr-xr-x  4 mylene  staff   128B Dec 16 04:00 tiles
...

352M	build/tiles/
```

✅ **Le frontend est prêt !**

---

### 2.5. Préparation du Backend

Le backend ne sera PAS buildé en développement. On transfère le code source.

#### Étape 5.1 : Vérifier la configuration

```bash
cd /Users/mylene/Developer/Omega-fix/backend
```

#### Étape 5.2 : Vérifier le fichier .env.production

```bash
cat .env.developpement.developpement.production
```

**Contenu attendu (à adapter pour la DDT) :**
```env
# Base de données PostgreSQL DDT
POSTGRES_HOST=10.28.8.236
POSTGRES_PORT=5432
POSTGRES_DB=omega
POSTGRES_USR=postgres
POSTGRES_PWD=VotreMotDePasseSecuriseDDT

# URLs
NEXT_PUBLIC_API_URL=http://10.28.8.236
FRONTEND_URL=http://10.28.8.236

# JWT
JWT_SECRET=Omega-Production-DDT-2024-SecureKey!
JWT_EXPIRY=4h

# Environnement
NODE_ENV=production
PORT=3000
```

⚠️ **IMPORTANT :** Mettez à jour les valeurs selon votre environnement DDT.

---

### 2.6. Création du package de déploiement

Créer un dossier propre avec tous les fichiers nécessaires.

#### Étape 6.1 : Créer le dossier de déploiement

```bash
cd /Users/mylene/Developer/Omega-fix
mkdir -p omega-production-node16
```

#### Étape 6.2 : Copier le Backend (code source uniquement)

```bash
# Copier tout le backend
cp -r backend omega-production-node16/

# Supprimer node_modules et .next (seront recréés sur le serveur)
rm -rf omega-production-node16/backend/node_modules
rm -rf omega-production-node16/backend/.next

# Supprimer les fichiers de dev
rm -f omega-production-node16/backend/.env.developpement.developpement

# S'assurer que .env.developpement.developpement.production existe
cp backend/.env.developpement.developpement.production omega-production-node16/backend/

echo "✅ Backend copié"
```

#### Étape 6.3 : Copier le Frontend (build compilé)

```bash
# Créer le dossier frontend
mkdir -p omega-production-node16/frontend

# Copier le build complet (avec tuiles)
cp -r frontend/build omega-production-node16/frontend/

echo "✅ Frontend copié"
```

#### Étape 6.4 : Vérifier la structure

```bash
tree -L 3 omega-production-node16/
```

**Structure attendue :**
```
omega-production-node16/
├── backend/
│   ├── app/                    # Code Next.js
│   ├── config/                 # Configuration
│   ├── models/                 # Modèles Sequelize
│   ├── utils/                  # Utilitaires
│   ├── monitoring/             # Scripts monitoring
│   ├── package.json            # Node 16 compatible
│   ├── package-lock.json
│   ├── next.config.js
│   └── .env.production         # Variables d'environnement
│
└── frontend/
    └── build/                  # Build React
        ├── static/             # JS/CSS compilés
        ├── tiles/              # 352 MB tuiles IGN
        │   ├── plan/           # 6631 tuiles PNG
        │   └── ortho/          # 6631 tuiles JPEG
        ├── index.html
        ├── favicon.ico
        └── ...
```

#### Étape 6.5 : Vérifier la taille totale

```bash
du -sh omega-production-node16/
du -sh omega-production-node16/backend/
du -sh omega-production-node16/frontend/
```

**Taille attendue :**
```
~420M	omega-production-node16/
~60M	omega-production-node16/backend/
~360M	omega-production-node16/frontend/
```

#### Étape 6.6 : Créer un fichier de vérification

```bash
cat > omega-production-node16/VERIFICATION.txt << 'EOF'
PACKAGE DE DÉPLOIEMENT OMEGA - DDT EURE-ET-LOIR
================================================

Date de création: $(date)
Version Node cible: 16.2.0

Contenu du package:
- Backend: Code source Next.js 13.5.6 + React 18.3.1
- Frontend: Build React avec tuiles IGN (352 MB)

Vérifications avant transfert:
[✓] Backend contient package.json
[✓] Backend contient .env.production
[✓] Frontend contient build/index.html
[✓] Frontend contient build/tiles/plan/ (6631 fichiers)
[✓] Frontend contient build/tiles/ortho/ (6631 fichiers)

Prochaines étapes:
1. Copier sur clé USB
2. Transférer vers serveur DDT (10.28.8.236)
3. Suivre les instructions du guide de déploiement
EOF

cat omega-production-node16/VERIFICATION.txt
```

---

## 3. PHASE 2 : TRANSFERT VERS LE SERVEUR DDT

### Étape 7.1 : Insérer la clé USB

Insérer votre clé USB formatée en NTFS.

**Sur macOS :**
```bash
# Vérifier le point de montage
diskutil list
```

La clé USB sera généralement montée sur `/Volumes/NomDeVotreCle/`

### Étape 7.2 : Copier le package sur la clé USB

```bash
# Adapter le chemin selon votre clé USB
cp -r omega-production-node16 /Volumes/USB_DDT/

# Vérifier la copie
ls -lh /Volumes/USB_DDT/omega-production-node16/
```

**Durée estimée :** 5-10 minutes (selon la vitesse USB)

### Étape 7.3 : Éjecter la clé USB en toute sécurité

```bash
diskutil eject /Volumes/USB_DDT
```

✅ **Le package est prêt pour le transfert !**

---

## 4. PHASE 3 : INSTALLATION SUR LE SERVEUR WAMP

**⚠️ Toutes les commandes suivantes sont à exécuter sur le serveur Windows DDT en tant qu'administrateur.**

### 4.1. Installation de Node.js

#### Étape 8.1 : Vérifier si Node.js est déjà installé

Ouvrir **PowerShell en administrateur** :

```powershell
node --version
```

**Si Node.js 16.2.0 est déjà installé**, passer à l'étape 4.2.

**Si Node.js n'est pas installé ou version différente :**

#### Étape 8.2 : Télécharger Node.js 16.20.2 (dernière 16.x LTS)

**Option A : Téléchargement direct sur le serveur**

```powershell
# Télécharger l'installateur
$url = "https://nodejs.org/download/release/v16.20.2/node-v16.20.2-x64.msi"
$output = "C:\Temp\node-v16.20.2-x64.msi"
Invoke-WebRequest -Uri $url -OutFile $output
```

**Option B : Copie depuis la clé USB (si préalablement téléchargé)**

Copier `node-v16.20.2-x64.msi` depuis votre clé USB vers `C:\Temp\`

#### Étape 8.3 : Installer Node.js

```powershell
# Installer silencieusement
msiexec /i C:\Temp\node-v16.20.2-x64.msi /quiet /norestart

# Attendre la fin de l'installation (environ 2 minutes)
Start-Sleep -Seconds 120

# Vérifier l'installation
node --version
npm --version
```

**Sortie attendue :**
```
v16.20.2 (ou v16.2.0)
8.19.4
```

#### Étape 8.4 : Installer PM2 (gestionnaire de processus Node.js)

```powershell
npm install -g pm2
npm install -g pm2-windows-service

# Vérifier
pm2 --version
```

---

### 4.2. Déploiement du Backend

#### Étape 9.1 : Créer le dossier d'installation

```powershell
# Créer la structure des dossiers
New-Item -Path "Z:\omega\deploy" -ItemType Directory -Force
New-Item -Path "Z:\omega\deploy\backend" -ItemType Directory -Force
```

#### Étape 9.2 : Copier le backend depuis la clé USB

**Adapter la lettre de lecteur selon votre système (E:, F:, etc.)**

```powershell
# Vérifier la lettre de lecteur USB
Get-Volume

# Copier le backend (adapter E: si nécessaire)
Copy-Item -Path "E:\omega-production-node16\backend\*" -Destination "Z:\omega\deploy\backend\" -Recurse -Force

# Vérifier la copie
Get-ChildItem Z:\omega\deploy\backend\
```

#### Étape 9.3 : Configurer les variables d'environnement

```powershell
cd Z:\omega\deploy\backend

# Copier .env.production vers .env
Copy-Item .env.production .env

# Éditer le fichier .env avec Notepad
notepad .env
```

**⚠️ IMPORTANT : Mettre à jour les valeurs suivantes dans `.env` :**

```env
# Base de données PostgreSQL DDT
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=omega
POSTGRES_USR=postgres
POSTGRES_PWD=MotDePassePostgreSQLDeDT

# URLs (adapter selon votre configuration)
NEXT_PUBLIC_API_URL=http://10.28.8.236
FRONTEND_URL=http://10.28.8.236

# JWT (générer une clé sécurisée)
JWT_SECRET=VotreCleSuperSecuriseePourLaDDT2024!
JWT_EXPIRY=4h

# Environnement
NODE_ENV=production
PORT=3000
```

**Sauvegarder et fermer Notepad.**

#### Étape 9.4 : Installer les dépendances Node.js

```powershell
cd Z:\omega\deploy\backend

# Installer les dépendances (production uniquement)
npm install --production
```

**Durée estimée :** 3-5 minutes

**Sortie attendue (fin) :**
```
added 303 packages in 2m
```

#### Étape 9.5 : Tester la connexion à la base de données

```powershell
# Test simple de connexion
$env:POSTGRES_HOST="localhost"
$env:POSTGRES_DB="omega"
$env:POSTGRES_USR="postgres"
$env:POSTGRES_PWD="VotreMotDePasse"

node -e "const { Client } = require('pg'); const client = new Client({ host: process.env.POSTGRES_HOST, database: process.env.POSTGRES_DB, user: process.env.POSTGRES_USR, password: process.env.POSTGRES_PWD, port: 5432 }); client.connect().then(() => { console.log('✅ Connexion BDD réussie'); client.end(); }).catch(err => console.error('❌ Erreur:', err));"
```

**Sortie attendue :** `✅ Connexion BDD réussie`

#### Étape 9.6 : Build du backend (sur le serveur)

```powershell
cd Z:\omega\deploy\backend

# Build de production
npm run build
```

**Durée estimée :** 2-5 minutes

**Sortie attendue (fin) :**
```
✓ Creating an optimized production build
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization

Route (app)                              Size     First Load JS
┌ ○ /                                    ...      ...
└ ƒ /api/*                               ...      ...

✓ Compiled successfully
```

#### Étape 9.7 : Installer le backend comme service Windows avec PM2

```powershell
cd Z:\omega\deploy\backend

# Installer PM2 comme service Windows
pm2-service-install -n PM2

# Démarrer le backend avec PM2
pm2 start npm --name "omega-backend" -- start

# Sauvegarder la configuration PM2
pm2 save

# Configurer le démarrage automatique
pm2 startup

# Vérifier le statut
pm2 status
pm2 logs omega-backend --lines 20
```

**Sortie attendue de `pm2 status` :**
```
┌─────┬──────────────────┬─────────┬─────────┬─────────┬──────────┐
│ id  │ name             │ mode    │ ↺       │ status  │ cpu      │
├─────┼──────────────────┼─────────┼─────────┼─────────┼──────────┤
│ 0   │ omega-backend    │ fork    │ 0       │ online  │ 0%       │
└─────┴──────────────────┴─────────┴─────────┴─────────┴──────────┘
```

#### Étape 9.8 : Tester le backend

```powershell
# Test de l'API
curl http://localhost:3000/api/health

# Ou avec un navigateur
Start-Process "http://localhost:3000"
```

✅ **Le backend est installé et fonctionne !**

---

### 4.3. Déploiement du Frontend

#### Étape 10.1 : Créer le dossier d'installation du frontend

```powershell
# Créer le dossier frontend
New-Item -Path "Z:\omega\deploy\frontend" -ItemType Directory -Force
```

#### Étape 10.2 : Copier le build frontend depuis la clé USB

```powershell
# Copier le build (adapter E: si nécessaire)
Copy-Item -Path "E:\omega-production-node16\frontend\build\*" -Destination "Z:\omega\deploy\frontend\" -Recurse -Force
```

**Note:** Les tuiles IGN sont incluses dans ce build sous `Z:\omega\deploy\frontend\tiles\`

**Durée estimée :** 3-5 minutes (à cause des 13,000 tuiles)

#### Étape 10.3 : Vérifier la copie

```powershell
# Vérifier la structure
Get-ChildItem Z:\omega\deploy\frontend\

# Vérifier les tuiles
Get-ChildItem Z:\omega\deploy\frontend\tiles\

# Compter les tuiles Plan
(Get-ChildItem -Path "Z:\omega\deploy\frontend\tiles\plan\" -Recurse -File).Count

# Compter les tuiles Ortho
(Get-ChildItem -Path "Z:\omega\deploy\frontend\tiles\ortho\" -Recurse -File).Count
```

**Sortie attendue :**
```
# Structure
Mode    LastWriteTime    Length Name
----    -------------    ------ ----
d-----  ...                     static
d-----  ...                     tiles
-a----  ...              3245   index.html
...

# Tuiles Plan
6631

# Tuiles Ortho
6631
```

✅ **Le frontend est copié !**

---

### 4.4. Configuration d'Apache

#### Étape 11.1 : Localiser le fichier de configuration Apache

```powershell
# Trouver la version d'Apache installée
Get-ChildItem C:\wamp64\bin\apache\
```

**Exemple de sortie :** `apache2.4.54`

**Adapter le chemin dans les commandes suivantes selon votre version.**

#### Étape 11.2 : Activer les modules Apache nécessaires

Éditer le fichier `httpd.conf` :

```powershell
notepad C:\wamp64\bin\apache\apache2.4.54\conf\httpd.conf
```

**Rechercher et décommenter (retirer le `#` devant) ces lignes :**

```apache
LoadModule proxy_module modules/mod_proxy.so
LoadModule proxy_http_module modules/mod_proxy_http.so
LoadModule rewrite_module modules/mod_rewrite.so
LoadModule headers_module modules/mod_headers.so
```

**Sauvegarder et fermer.**

#### Étape 11.3 : Créer le Virtual Host pour Omega

Créer un nouveau fichier :

```powershell
notepad C:\wamp64\bin\apache\apache2.4.54\conf\extra\httpd-omega.conf
```

**Copier ce contenu dans le fichier :**

```apache
<VirtualHost *:80>
    ServerName omega.ddt-eure-et-loir.local
    ServerAlias 10.28.8.236
    DocumentRoot "Z:/omega/deploy/frontend"

    # Configuration du dossier frontend
    <Directory "Z:/omega/deploy/frontend">
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted

        # Support pour React Router (SPA)
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    # Optimisation pour les tuiles (cache)
    <Directory "Z:/omega/deploy/frontend/tiles">
        # Cache les tuiles pendant 30 jours
        Header set Cache-Control "max-age=2592000, public"
        # Désactiver les logs d'accès pour les tuiles (optimisation)
        SetEnvIf Request_URI "^/tiles/" dontlog
    </Directory>

    # Proxy vers le backend Node.js pour les routes /api
    ProxyPreserveHost On
    ProxyPass /api http://localhost:3000/api
    ProxyPassReverse /api http://localhost:3000/api

    # Timeout augmenté pour VEEAM
    ProxyTimeout 60

    # Logs
    ErrorLog "C:/wamp64/logs/omega-error.log"
    CustomLog "C:/wamp64/logs/omega-access.log" combined env=!dontlog
</VirtualHost>
```

**Sauvegarder et fermer.**

#### Étape 11.4 : Inclure le Virtual Host dans httpd.conf

Rouvrir `httpd.conf` :

```powershell
notepad C:\wamp64\bin\apache\apache2.4.54\conf\httpd.conf
```

**Aller à la fin du fichier et ajouter cette ligne :**

```apache
# Configuration Omega DDT
Include conf/extra/httpd-omega.conf
```

**Sauvegarder et fermer.**

#### Étape 11.5 : Tester la configuration Apache

```powershell
# Tester la syntaxe de configuration
C:\wamp64\bin\apache\apache2.4.54\bin\httpd.exe -t
```

**Sortie attendue :**
```
Syntax OK
```

**Si erreur :** Vérifier les chemins et la syntaxe dans les fichiers de configuration.

#### Étape 11.6 : Redémarrer Apache

**Option A : Via l'interface WAMP**

Clic droit sur l'icône WAMP dans la barre des tâches → Apache → Service → Restart Service

**Option B : En ligne de commande**

```powershell
net stop wampapache64
Start-Sleep -Seconds 2
net start wampapache64
```

**Sortie attendue :**
```
Le service Apache2.4 est en cours d'arrêt.
Le service Apache2.4 a été arrêté.

Le service Apache2.4 est en cours de démarrage.
Le service Apache2.4 a démarré.
```

#### Étape 11.7 : Vérifier qu'Apache écoute sur le port 80

```powershell
netstat -an | findstr :80
```

**Sortie attendue :**
```
TCP    0.0.0.0:80             0.0.0.0:0              LISTENING
```

✅ **Apache est configuré et fonctionne !**

---

## 5. PHASE 4 : CONFIGURATION RÉSEAU ET SÉCURITÉ

### Étape 12.1 : Configurer le pare-feu Windows

Ouvrir **PowerShell en administrateur** :

```powershell
# Autoriser le port 80 (Apache) pour le réseau DDT
New-NetFirewallRule -DisplayName "Omega - Apache HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -RemoteAddress 10.28.8.0/24 -Action Allow

# Autoriser le port 3000 (Node.js) uniquement en localhost
New-NetFirewallRule -DisplayName "Omega - Node.js Backend" -Direction Inbound -Protocol TCP -LocalPort 3000 -RemoteAddress 127.0.0.1 -Action Allow

# Vérifier les règles créées
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "Omega*"} | Format-Table DisplayName, Enabled, Direction, Action
```

**Sortie attendue :**
```
DisplayName              Enabled Direction Action
-----------              ------- --------- ------
Omega - Apache HTTP      True    Inbound   Allow
Omega - Node.js Backend  True    Inbound   Allow
```

### Étape 12.2 : Configurer le fichier hosts (optionnel)

Pour accéder via un nom de domaine interne.

#### Sur le serveur :

```powershell
# Éditer le fichier hosts
notepad C:\Windows\System32\drivers\etc\hosts
```

**Ajouter cette ligne :**
```
10.28.8.236   omega.ddt-eure-et-loir.local
```

**Sauvegarder et fermer.**

#### Sur les postes clients DDT (via GPO ou manuellement) :

Répéter l'opération ci-dessus sur chaque poste.

### Étape 12.3 : Tester l'accès depuis le serveur

```powershell
# Test via IP
curl http://10.28.8.236

# Test via nom de domaine (si configuré)
curl http://omega.ddt-eure-et-loir.local

# Test de l'API via proxy Apache
curl http://10.28.8.236/api/health

# Ouvrir dans le navigateur
Start-Process "http://10.28.8.236"
```

✅ **Le serveur est accessible localement !**

---

## 6. PHASE 5 : TESTS ET VALIDATION

### Étape 13.1 : Test depuis un poste client DDT

**Se connecter à un poste client sur le réseau DDT (10.28.8.x) :**

#### Test 1 : Accès frontend

Ouvrir un navigateur et aller sur :
```
http://10.28.8.236
```

**Résultat attendu :** La page d'accueil Omega s'affiche.

#### Test 2 : Connexion backend

Dans la console du navigateur (F12), vérifier qu'il n'y a pas d'erreurs réseau.

**Résultat attendu :** Aucune erreur 404 ou 500.

#### Test 3 : Tuiles IGN (mode hors-ligne)

Sur la page avec la carte :
1. Naviguer sur la carte
2. Changer entre "Plan IGN" et "Orthophoto IGN"
3. Zoomer/dézoomer

**Résultat attendu :** Les tuiles se chargent correctement sans erreur 404.

#### Test 4 : Création d'un projet

1. Cliquer sur "Nouveau projet"
2. Dessiner une zone sur la carte
3. Remplir le formulaire
4. Enregistrer

**Résultat attendu :** Le projet est créé et visible dans la liste.

#### Test 5 : Recherche et filtres

1. Utiliser la barre de recherche
2. Appliquer des filtres (service, thématique, etc.)

**Résultat attendu :** Les résultats se mettent à jour correctement.

### Étape 13.2 : Test de performance

#### Sur le serveur :

```powershell
# Vérifier l'utilisation CPU/RAM du backend
pm2 monit

# Vérifier les logs
pm2 logs omega-backend --lines 50
```

#### Sur un poste client :

1. Ouvrir les outils de développement (F12)
2. Aller dans l'onglet "Network"
3. Recharger la page
4. Vérifier les temps de chargement

**Résultats attendus :**
- Page principale : < 2 secondes
- API requests : < 500ms
- Tuiles : < 200ms (mises en cache après le premier chargement)

### Étape 13.3 : Test de sauvegarde VEEAM (avec l'équipe infrastructure)

**Planifier un test avec VEEAM :**

1. Lancer une sauvegarde manuelle VEEAM
2. Pendant la sauvegarde, utiliser l'application
3. Observer les temps de réponse

**Résultat attendu :** Légère augmentation de la latence (1-2 secondes), mais pas d'erreurs.

---

## 7. MAINTENANCE ET GESTION

### Gestion du Backend (PM2)

#### Voir le statut

```powershell
pm2 status
```

#### Redémarrer le backend

```powershell
pm2 restart omega-backend
```

#### Voir les logs en temps réel

```powershell
pm2 logs omega-backend
```

#### Voir les métriques

```powershell
pm2 monit
```

#### Arrêter le backend

```powershell
pm2 stop omega-backend
```

#### Démarrer le backend

```powershell
pm2 start omega-backend
```

### Gestion d'Apache (WAMP)

#### Redémarrer Apache

```powershell
net stop wampapache64
net start wampapache64
```

#### Voir les logs

```powershell
# Logs d'erreur
Get-Content C:\wamp64\logs\omega-error.log -Tail 50

# Logs d'accès
Get-Content C:\wamp64\logs\omega-access.log -Tail 50
```

### Mise à jour de l'application

#### Pour mettre à jour le backend :

```powershell
cd Z:\omega\deploy\backend
pm2 stop omega-backend
git pull  # Si Git est configuré
# OU copier les nouveaux fichiers depuis USB
npm install --production
npm run build
pm2 restart omega-backend
```

#### Pour mettre à jour le frontend :

```powershell
# Sauvegarder l'ancien build
Rename-Item Z:\omega\deploy\frontend Z:\omega\deploy\frontend-backup-$(Get-Date -Format 'yyyyMMdd')

# Copier le nouveau build
Copy-Item -Path "E:\nouveau-build\*" -Destination "Z:\omega\deploy\frontend\" -Recurse
```

### Surveillance des logs

#### Créer un script de surveillance automatique

Créer `Z:\omega\deploy\monitor-logs.ps1` :

```powershell
# Script de surveillance des logs Omega
$ErrorLog = "C:\wamp64\logs\omega-error.log"
$BackendLog = "Z:\omega\deploy\backend\logs\backend.log"

Write-Host "=== Surveillance des logs Omega ===" -ForegroundColor Cyan
Write-Host "Appuyez sur Ctrl+C pour arrêter" -ForegroundColor Yellow
Write-Host ""

while ($true) {
    Clear-Host
    Write-Host "=== Dernières erreurs Apache (Omega) ===" -ForegroundColor Red
    Get-Content $ErrorLog -Tail 10 -ErrorAction SilentlyContinue

    Write-Host "`n=== Derniers logs Backend ===" -ForegroundColor Green
    pm2 logs omega-backend --lines 10 --nostream

    Start-Sleep -Seconds 5
}
```

**Lancer le script :**
```powershell
PowerShell.exe -ExecutionPolicy Bypass -File Z:\omega\deploy\monitor-logs.ps1
```

---

## 8. DÉPANNAGE

### Problème : Le backend ne démarre pas

**Symptômes :** `pm2 status` montre "errored" ou "stopped"

**Vérifications :**

1. **Vérifier les logs :**
   ```powershell
   pm2 logs omega-backend --err
   ```

2. **Vérifier la connexion à la base de données :**
   ```powershell
   cd Z:\omega\deploy\backend
   $env:NODE_ENV="production"
   node -e "require('./config/database.js')"
   ```

3. **Vérifier les variables d'environnement :**
   ```powershell
   Get-Content Z:\omega\deploy\backend\.env
   ```

4. **Réinstaller les dépendances :**
   ```powershell
   cd Z:\omega\deploy\backend
   Remove-Item node_modules -Recurse -Force
   npm install --production
   pm2 restart omega-backend
   ```

### Problème : Apache ne démarre pas

**Symptômes :** Erreur lors du démarrage d'Apache

**Vérifications :**

1. **Tester la configuration :**
   ```powershell
   C:\wamp64\bin\apache\apache2.4.54\bin\httpd.exe -t
   ```

2. **Vérifier les logs :**
   ```powershell
   Get-Content C:\wamp64\logs\apache_error.log -Tail 20
   ```

3. **Vérifier le port 80 :**
   ```powershell
   netstat -ano | findstr :80
   ```

4. **Si le port 80 est utilisé par un autre service :**
   ```powershell
   # Identifier le processus
   $port80Process = Get-NetTCPConnection -LocalPort 80 -ErrorAction SilentlyContinue
   Get-Process -Id $port80Process.OwningProcess
   ```

### Problème : Les tuiles ne s'affichent pas

**Symptômes :** Carte blanche ou erreurs 404 pour les tuiles

**Vérifications :**

1. **Vérifier que les tuiles existent :**
   ```powershell
   Test-Path Z:\omega\deploy\frontend\tiles\plan\10\513\351.png
   Test-Path Z:\omega\deploy\frontend\tiles\ortho\11\1026\703.jpg
   ```

2. **Vérifier les permissions :**
   ```powershell
   Get-Acl Z:\omega\deploy\frontend\tiles\
   ```

3. **Vérifier dans la console navigateur (F12) :**
   - Rechercher les erreurs 404 pour `/tiles/...`
   - Vérifier l'URL complète des tuiles

4. **Vérifier la configuration frontend :**
   - Ouvrir `http://10.28.8.236`
   - F12 → Console
   - Taper : `console.log(window.location.href)`
   - Vérifier que le mode tuiles est "local"

### Problème : Erreurs 502 Bad Gateway

**Symptômes :** Erreur 502 lors de l'accès à `/api/*`

**Cause probable :** Le backend Node.js ne répond pas.

**Solutions :**

1. **Vérifier que le backend tourne :**
   ```powershell
   pm2 status
   curl http://localhost:3000/api/health
   ```

2. **Redémarrer le backend :**
   ```powershell
   pm2 restart omega-backend
   ```

3. **Vérifier la configuration du proxy Apache :**
   ```powershell
   notepad C:\wamp64\bin\apache\apache2.4.54\conf\extra\httpd-omega.conf
   ```

### Problème : L'application est lente pendant les sauvegardes VEEAM

**Symptômes :** Timeouts ou lenteurs pendant les sauvegardes

**Cause :** Configuration VEEAM trop agressive ou timeouts insuffisants.

**Solutions :**

1. **Les timeouts ont déjà été augmentés à 60 secondes** dans `config/database.js`

2. **Vérifier avec l'équipe infrastructure :**
   - Planifier VEEAM pendant les heures creuses (2h-5h du matin)
   - Activer le mode "Application-Aware" pour PostgreSQL
   - Utiliser VSS (Volume Shadow Copy) pour minimiser l'impact

3. **Monitorer pendant une sauvegarde :**
   ```powershell
   pm2 monit
   # Observer la latence des requêtes
   ```

---

## 9. ANNEXES

### Annexe A : Architecture technique

```
┌─────────────────────────────────────────────────────────┐
│                     RÉSEAU DDT (10.28.8.0/24)           │
│                                                          │
│  ┌──────────────────┐   ┌──────────────────┐           │
│  │  Poste Client 1  │   │  Poste Client N  │           │
│  │  10.28.8.x       │   │  10.28.8.y       │           │
│  └────────┬─────────┘   └────────┬─────────┘           │
│           │                       │                      │
│           └───────────┬───────────┘                      │
│                       │ HTTP Port 80                     │
│                       ▼                                  │
│  ┌─────────────────────────────────────────────┐        │
│  │  SERVEUR WAMP (10.28.8.236)                 │        │
│  │                                              │        │
│  │  ┌────────────────────────────────────┐     │        │
│  │  │ APACHE (Port 80)                   │     │        │
│  │  │ - DocumentRoot: Z:\omega\deploy\frontend│  │        │
│  │  │ - Sert fichiers statiques React    │     │        │
│  │  │ - Proxy /api → localhost:3000      │     │        │
│  │  └────────────┬───────────────────────┘     │        │
│  │               │                              │        │
│  │               ▼                              │        │
│  │  ┌────────────────────────────────────┐     │        │
│  │  │ NODE.JS BACKEND (Port 3000)        │     │        │
│  │  │ - Next.js 13.5.6                   │     │        │
│  │  │ - React 18.3.1                     │     │        │
│  │  │ - API Routes (/api/*)              │     │        │
│  │  │ - Géré par PM2 (service Windows)   │     │        │
│  │  └────────────┬───────────────────────┘     │        │
│  │               │                              │        │
│  │               ▼                              │        │
│  │  ┌────────────────────────────────────┐     │        │
│  │  │ POSTGRESQL (Port 5432)             │     │        │
│  │  │ - Base: omega                      │     │        │
│  │  │ - User: postgres                   │     │        │
│  │  │ - Sauvegarde: VEEAM                │     │        │
│  │  └────────────────────────────────────┘     │        │
│  │                                              │        │
│  │  FILESYSTEM:                                 │        │
│  │  - Frontend: Z:\omega\deploy\frontend\       │        │
│  │    → build/ (10 MB)                          │        │
│  │    → tiles/ (352 MB)                         │        │
│  │       → plan/ (6631 PNG, 266 MB)             │        │
│  │       → ortho/ (6631 JPG, 85 MB)             │        │
│  │                                              │        │
│  │  - Backend: Z:\omega\deploy\backend\         │        │
│  │    → app/ (code Next.js)                     │        │
│  │    → .next/ (build)                          │        │
│  │    → node_modules/ (303 packages)            │        │
│  │                                              │        │
│  └─────────────────────────────────────────────┘        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Annexe B : Ports et services

| Port | Service | Exposition | Description |
|------|---------|------------|-------------|
| **80** | Apache WAMP | Réseau DDT (10.28.8.0/24) | Frontend React + Proxy API |
| **3000** | Node.js Backend | Localhost uniquement | API Next.js |
| **5432** | PostgreSQL | Localhost uniquement | Base de données |

### Annexe C : Fichiers de configuration importants

| Fichier | Chemin | Description |
|---------|--------|-------------|
| **httpd.conf** | `C:\wamp64\bin\apache\apache2.4.x\conf\httpd.conf` | Configuration principale Apache |
| **httpd-omega.conf** | `C:\wamp64\bin\apache\apache2.4.x\conf\extra\httpd-omega.conf` | Virtual Host Omega |
| **.env** | `Z:\omega\deploy\backend\.env` | Variables d'environnement backend |
| **next.config.js** | `Z:\omega\deploy\backend\next.config.js` | Configuration Next.js |
| **database.js** | `Z:\omega\deploy\backend\config\database.js` | Configuration Sequelize/PostgreSQL |

### Annexe D : Commandes utiles

#### Redémarrage complet

```powershell
# 1. Arrêter tout
pm2 stop omega-backend
net stop wampapache64

# 2. Redémarrer tout
net start wampapache64
pm2 restart omega-backend

# 3. Vérifier
pm2 status
netstat -an | findstr ":80 :3000"
```

#### Sauvegarde de la configuration

```powershell
# Créer un dossier de sauvegarde
New-Item -Path "C:\omega-backup-$(Get-Date -Format 'yyyyMMdd')" -ItemType Directory

# Sauvegarder la config Apache
Copy-Item "C:\wamp64\bin\apache\apache2.4.x\conf\extra\httpd-omega.conf" "C:\omega-backup-$(Get-Date -Format 'yyyyMMdd')\"

# Sauvegarder .env backend
Copy-Item "Z:\omega\deploy\backend\.env" "C:\omega-backup-$(Get-Date -Format 'yyyyMMdd')\"

# Sauvegarder PM2 config
pm2 save
Copy-Item "$env:USERPROFILE\.pm2\dump.pm2" "C:\omega-backup-$(Get-Date -Format 'yyyyMMdd')\"
```

### Annexe E : Contacts et support

| Rôle | Contact | Responsabilité |
|------|---------|----------------|
| **Admin Système** | admin-sys@ddt28.gouv.fr | Serveur WAMP, réseau, pare-feu |
| **DBA PostgreSQL** | dba@ddt28.gouv.fr | Base de données, VEEAM |
| **Développeur Omega** | dev-omega@ddt28.gouv.fr | Application, bugs, évolutions |

### Annexe F : Checklist de déploiement

Imprimer et cocher au fur et à mesure :

#### PC de développement
- [ ] Vérification environnement (Node, npm, Git)
- [ ] Configuration packages Node 16.2.0
- [ ] Activation venv Python
- [ ] Suppression tuiles vides
- [ ] Téléchargement tuiles Plan (6631 fichiers, 266 MB)
- [ ] Téléchargement tuiles Ortho (6631 fichiers, 85 MB)
- [ ] Vérification tuiles (total 352 MB)
- [ ] Build frontend (avec tuiles)
- [ ] Vérification .env.production backend
- [ ] Création package déploiement
- [ ] Copie sur clé USB

#### Serveur WAMP DDT
- [ ] Installation Node.js 16.20.2
- [ ] Installation PM2
- [ ] Copie backend depuis USB
- [ ] Configuration .env backend
- [ ] `npm install --production` backend
- [ ] Test connexion PostgreSQL
- [ ] Build backend (`npm run build`)
- [ ] Installation backend comme service PM2
- [ ] Test backend (http://localhost:3000)
- [ ] Copie frontend dans Z:\omega\deploy\frontend\
- [ ] Vérification tuiles copiées
- [ ] Activation modules Apache (proxy, rewrite, headers)
- [ ] Création httpd-omega.conf
- [ ] Inclusion dans httpd.conf
- [ ] Test config Apache (`httpd -t`)
- [ ] Redémarrage Apache
- [ ] Configuration pare-feu Windows
- [ ] Configuration fichier hosts (optionnel)
- [ ] Test accès depuis serveur
- [ ] Test accès depuis poste client
- [ ] Test création projet
- [ ] Test tuiles Plan/Ortho
- [ ] Test performance
- [ ] Planification test VEEAM

---

## 📞 SUPPORT ET ASSISTANCE

En cas de problème pendant le déploiement, vérifier :

1. **Les logs** :
   - Backend : `pm2 logs omega-backend`
   - Apache : `C:\wamp64\logs\omega-error.log`
   - PostgreSQL : Logs WAMP

2. **La documentation** :
   - Ce guide de déploiement
   - Documentation Next.js 13 : https://nextjs.org/docs
   - Documentation Sequelize : https://sequelize.org/docs/v6/

3. **Les ressources en ligne** :
   - GitHub Issues du projet
   - Documentation interne DDT

---

**FIN DU GUIDE DE DÉPLOIEMENT**

*Dernière mise à jour : 16 Décembre 2024*
*Version : 1.0*
