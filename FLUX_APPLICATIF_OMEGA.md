# Flux Applicatif OMEGA

## Architecture Applicative (β - Vue Hiérarchique)

```mermaid
graph TB
    subgraph "Couche Présentation"
        USER["👤 Utilisateur DDT<br/>Navigateur Web"]
        ADMIN["👨‍💼 Admin DDT<br/>Terminal SSH"]
    end

    subgraph "Couche Sécurité"
        FW["🧱 Pare-feu<br/>Filtrage HTTPS:443"]
        REVERSE["🔄 Reverse Proxy Nginx<br/>DMZ - 192.168.1.10/32"]
    end

    subgraph "Couche Application"
        FRONTEND["🎨 Frontend<br/>React.js - Port 3001<br/>192.168.0.50/32"]
        BACKEND["⚙️ Backend API<br/>Next.js/Node.js - Port 3000<br/>192.168.0.50/32"]
        TILES["🗺️ Tuiles locales<br/>/tiles/plan/ + /tiles/ortho/"]
    end

    subgraph "Couche Données"
        DB[("🗄️ PostgreSQL + PostGIS<br/>Port 5432<br/>192.168.0.80/32")]
    end

    %% Flux descendants
    USER -->|"1. HTTPS 443"| FW
    FW -->|"2. HTTPS 443"| REVERSE
    REVERSE -->|"3. HTTP 3001"| FRONTEND
    FRONTEND -->|"4. API REST/JSON"| BACKEND
    BACKEND -->|"5. SQL/Sequelize"| DB
    
    %% Flux tuiles
    FRONTEND -->|"Tuiles locales"| TILES
    
    %% Flux admin
    ADMIN -->|"SSH 22"| REVERSE

    %% Styles
    style USER fill:#e3f2fd
    style ADMIN fill:#fff3e0
    style FW fill:#ffcdd2
    style REVERSE fill:#fff9c4
    style FRONTEND fill:#c8e6c9
    style BACKEND fill:#a5d6a7
    style TILES fill:#dcedc8
    style DB fill:#f8bbd9
```

## Architecture en Couches (β)

```mermaid
graph LR
    subgraph "Niveau 1: Client"
        A[Utilisateur DDT]
    end

    subgraph "Niveau 2: Sécurité"
        B[Pare-feu]
        C[Reverse Proxy Nginx]
    end

    subgraph "Niveau 3: Application"
        D[Frontend React]
        E[Backend Next.js]
        F[Tuiles locales]
    end

    subgraph "Niveau 4: Données"
        G[(PostgreSQL/PostGIS)]
    end

    A --> B --> C --> D --> E --> G
    D --> F
```

## Description des Flux

### 1. **Flux Utilisateur → Application**
```
Utilisateur DDT
    ↓ HTTPS 443
Pare-feu (Filtrage)
    ↓ HTTPS 443
Reverse Proxy (Nginx)
    ↓ HTTP 3001
Frontend React.js (Port 3001)
```

### 2. **Flux Frontend → Backend**
```
Frontend React.js
    ↓ API REST / JSON
Backend Next.js (Port 3000)
    ↓ Requêtes Sequelize
PostgreSQL + PostGIS (Port 5432)
```

### 3. **Flux Cartographie (Tuiles locales)**
```
Frontend React.js
    ↓ Requête tuiles locales
Fichiers tuiles (/tiles/plan/{z}/{x}/{y}.png)
    ↓ ou
Fichiers tuiles (/tiles/ortho/{z}/{x}/{y}.png)
```

### 4. **Flux Administration**
```
Admin DDT
    ↓ SSH 22
Reverse Proxy (Bastion)
    ↓ Accès direct
Serveur Applicatif (Gestion)
```

## Composants Détaillés

| Composant | Technologie | Port | Rôle |
|-----------|-------------|------|------|
| **Frontend** | React.js 18 | 3001 | Interface utilisateur, carte interactive |
| **Backend** | Next.js 13 / Node.js | 3000 | API REST, authentification, métier |
| **Base de données** | PostgreSQL 14 + PostGIS | 5432 | Stockage données, géométries |
| **Tuiles** | Fichiers PNG locaux | - | Fond de carte IGN (plan + ortho) |
| **Reverse Proxy** | Nginx | 443/80 | Routage, SSL, sécurité |

## Flux de Données par Fonctionnalité

### Authentification
```
Login Form → /api/auth/login → Vérification JWT → Session
```

### Gestion des Projets
```
Formulaire → /api/projets → CRUD → PostgreSQL
Carte → /api/projets/geometry → PostGIS → Affichage
```

### Audit et Sécurité
```
Actions utilisateur → SecurityLog → PostgreSQL (principale.security_log)
```

### Administration
```
Panel Admin → /api/admin/* → Gestion users/logs/snapshots
```

## Sécurité

- **Pare-feu** : Filtre les flux entrants (HTTPS uniquement)
- **VLAN DMZ** : Isolation du reverse proxy
- **VLAN BDD** : Base de données isolée, accès uniquement depuis backend
- **JWT** : Authentification stateless avec tokens signés
- **Audit** : Journalisation de toutes les actions sensibles
