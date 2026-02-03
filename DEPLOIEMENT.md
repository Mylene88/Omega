# Guide de Déploiement - Application OMEGA

## Architecture de déploiement

### Environnement de développement (PC hors réseau DDT)
- **PC de développement** : Hors réseau DDT
- **Frontend local** : http://localhost:3001
- **Backend local** : http://localhost:3000
- **Base de données** : 10.28.8.246:5432

### Environnement de production (Serveur Omega - réseau cloisonné DDT)
- **Serveur Omega** : 10.28.8.236
- **Frontend production** : http://10.28.8.236:3001
- **Backend production** : http://10.28.8.236:3000
- **Base de données** : 10.28.8.246:5432 (inchangée)
- **Emplacement** : `\\omega\deploy\`
  - Frontend : `\\omega\deploy\frontend\`
  - Backend : `\\omega\deploy\backend\`

---

## Étape 1 : Build sur le PC de développement (hors réseau)

### 1.1 Build du Frontend

```bash
# Se placer dans le dossier frontend
cd frontend

# Installer les dépendances (si nécessaire)
npm install

# Build de production (utilise automatiquement .env.developpement.developpement.production)
npm run build
```

**Résultat** : Un dossier `frontend/build` sera créé avec tous les fichiers statiques optimisés.

### 1.2 Build du Backend

```bash
# Se placer dans le dossier backend
cd backend

# Installer les dépendances (si nécessaire)
npm install

# Build de production Next.js
npm run build
```

**Résultat** : Un dossier `backend/.next` sera créé avec l'application Next.js compilée.

---

## Étape 2 : Transfert des fichiers vers le PC sur réseau DDT

### 2.1 Fichiers Frontend à transférer

Copier les éléments suivants du PC de développement vers une clé USB ou partage réseau :

```
frontend/
├── build/                    # ← Dossier généré par npm run build
├── package.json              # ← Fichier de dépendances
├── package-lock.json         # ← Verrous des versions
└── .env.production           # ← Configuration production
```

### 2.2 Fichiers Backend à transférer

Copier les éléments suivants :

```
backend/
├── .next/                    # ← Dossier généré par npm run build
├── app/                      # ← Code source de l'application
├── middleware/               # ← Middlewares personnalisés
├── node_modules/             # ← Dépendances (optionnel, peut être réinstallé)
├── public/                   # ← Fichiers statiques
├── scripts/                  # ← Scripts utilitaires
├── package.json              # ← Fichier de dépendances
├── package-lock.json         # ← Verrous des versions
├── next.config.js            # ← Configuration Next.js (si existe)
└── .env.production           # ← Configuration production
```

**Note** : Le dossier `node_modules` peut être volumineux. Si vous avez accès à npm sur le serveur, vous pouvez le régénérer.

---

## Étape 3 : Déploiement sur le serveur Omega (depuis PC sur réseau DDT)

### 3.1 Déploiement du Frontend

```bash
# Depuis le PC sur réseau DDT, accéder au serveur Omega
# Copier les fichiers dans \\omega\deploy\frontend\

# Se connecter au serveur Omega (SSH ou RDP selon configuration)
cd /chemin/vers/omega/deploy/frontend

# Si node_modules n'a pas été transféré, installer les dépendances
npm install --production

# Le frontend (build React) peut être servi de plusieurs façons :

# Option A : Serveur Node.js simple (serve)
npx serve -s build -l 3001

# Option B : Serveur HTTP avec http-server
npx http-server build -p 3001

# Option C : Configuration avec un serveur web (Apache/Nginx)
# Configurer le serveur web pour pointer vers le dossier build/
```

### 3.2 Déploiement du Backend

```bash
# Copier les fichiers dans \\omega\deploy\backend\

# Se connecter au serveur Omega
cd /chemin/vers/omega/deploy/backend

# Si node_modules n'a pas été transféré, installer les dépendances
npm install --production

# Vérifier que le fichier .env.developpement.developpement.production est présent et correct
cat .env.developpement.developpement.production

# Démarrer le serveur backend Next.js en production
NODE_ENV=production npm start

# Le backend tournera sur le port 3000 (défini dans package.json)
```

---

## Étape 4 : Vérification du déploiement

### 4.1 Vérifier le Backend

```bash
# Test de l'API backend
curl http://10.28.8.236:3000/api/health

# Vérifier les logs du serveur
# (selon votre configuration de logs)
```

### 4.2 Vérifier le Frontend

```bash
# Ouvrir un navigateur sur un PC du réseau DDT
# Accéder à : http://10.28.8.236:3001
```

### 4.3 Vérifier la connexion Base de Données

Le backend doit pouvoir se connecter à la base PostgreSQL sur `10.28.8.246:5432`.

---

## Configuration des services (Optionnel mais recommandé)

Pour que les applications se lancent automatiquement au démarrage du serveur :

### Service Windows (si serveur Windows)

Créer des services Windows pour le frontend et le backend, ou utiliser un gestionnaire de processus comme `PM2`.

### PM2 (Gestionnaire de processus Node.js)

```bash
# Installer PM2 globalement
npm install -g pm2

# Démarrer le backend
cd /chemin/vers/omega/deploy/backend
pm2 start npm --name "omega-backend" -- start

# Démarrer le frontend (avec serve)
cd /chemin/vers/omega/deploy/frontend
pm2 start npx --name "omega-frontend" -- serve -s build -l 3001

# Sauvegarder la configuration PM2
pm2 save

# Configurer PM2 pour démarrer au boot
pm2 startup
```

---

## Variables d'environnement importantes

### Frontend (.env.production)
```env
PORT=3001
REACT_APP_API_URL=http://10.28.8.236:3000
REACT_APP_TILE_MODE=local                    # Important : mode local obligatoire
PUBLIC_URL=http://10.28.8.236:3001
NODE_ENV=production
```

### Backend (.env.production)
```env
# Base de données
DATABASE_URL=postgresql://adl:xx@10.28.8.246:5432/omega
POSTGRES_HOST=10.28.8.246
POSTGRES_PORT=5432

# JWT
JWT_SECRET=Omega-28!
JWT_EXPIRY=4h

# Frontend (CORS)
FRONTEND_URL=http://10.28.8.236:3001

# API
NEXT_PUBLIC_API_URL=http://10.28.8.236:3000
PORT=3000
NODE_ENV=production
```

---

## Troubleshooting

### Problème : Le frontend ne se connecte pas au backend
- Vérifier que `REACT_APP_API_URL` dans `.env.production` pointe bien vers `http://10.28.8.236:3000`
- Vérifier que le backend est bien démarré sur le port 3000
- Vérifier les règles de pare-feu sur le serveur Omega

### Problème : Erreur de connexion à la base de données
- Vérifier que le serveur PostgreSQL (10.28.8.246:5432) est accessible depuis le serveur Omega
- Vérifier les identifiants dans `.env.production`
- Tester la connexion : `psql -h 10.28.8.246 -p 5432 -U adl -d omega`

### Problème : Les tuiles de carte ne s'affichent pas
- Vérifier que `REACT_APP_TILE_MODE=local` dans `.env.production`
- Vérifier que les tuiles locales sont bien présentes dans le dossier approprié
- L'environnement cloisonné DDT ne permet pas l'accès Internet

---

## Checklist de déploiement

- [ ] Build frontend réussi (`npm run build`)
- [ ] Build backend réussi (`npm run build`)
- [ ] Fichiers `.env.production` créés et configurés
- [ ] Fichiers transférés sur le serveur Omega
- [ ] Dépendances installées (`npm install --production`)
- [ ] Backend démarré et accessible sur port 3000
- [ ] Frontend démarré et accessible sur port 3001
- [ ] Connexion base de données fonctionnelle
- [ ] Test de l'application dans le navigateur
- [ ] Configuration des services automatiques (PM2 ou équivalent)
- [ ] Documentation des procédures pour l'équipe

---

## Contact et support

En cas de problème, consulter les logs :
- Backend : Logs de Next.js
- Frontend : Console du navigateur
- Base de données : Logs PostgreSQL

**Date de création** : 2025-12-12