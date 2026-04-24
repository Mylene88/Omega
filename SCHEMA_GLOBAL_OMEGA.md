# Schéma Global du Système d'Information OMEGA

## Vue d'Ensemble de l'Architecture

```mermaid
graph TB
    subgraph "Périmètre d'Homologation"
        direction TB
        
        subgraph "Internet / RIE"
            INTERNET["🌐 Internet / RIE<br/>Réseau Interministériel de l'État"]
        end

        subgraph "Couche Sécurité Périphérique"
            direction LR
            FW["🧱 Pare-feu<br/>Filtrage étatique"]
            IDS["🔍 IDS/IPS<br/>Détection d'intrusion"]
            WAF["🛡️ WAF<br/>Protection applicative"]
        end

        subgraph "DMZ"
            direction TB
            REVERSE["🔄 Reverse Proxy Nginx<br/>Adresse DMZ:443<br/>Load Balancing + SSL"]
        end

        subgraph "Réseau Interne DDT"
            direction TB
            
            subgraph "VLAN Utilisateurs"
                USER["👤 Postes Utilisateurs<br/>Adresse VLAN Utilisateur"]
            end

            subgraph "VLAN Administration"
                ADMIN["👨‍💼 Postes Admin<br/>Adresse VLAN Admin<br/>Interface Admin Web"]
            end

            subgraph "Zone Applicative"
                direction LR
                FRONTEND["🎨 Frontend OMEGA<br/>React.js 18<br/>10.28.8.236:3001"]
                BACKEND["⚙️ Backend OMEGA<br/>Next.js 13 / Node.js<br/>10.28.8.236:3000"]
                TILES["🗺️ Tuiles IGN locales<br/>/tiles/plan/ + /tiles/ortho/"]
            end

            subgraph "Zone Données"
                DB[("🗄️ Base de Données<br/>PostgreSQL 14 + PostGIS<br/>10.28.8.246:5432")]
            end

            subgraph "Services Support"
                BACKUP["💾 Serveur Backup<br/>Sauvegarde quotidienne"]
            end
        end
    end

    %% Flux principaux
    INTERNET -->|"HTTPS 443"| FW
    FW --> IDS --> WAF --> REVERSE
    
    REVERSE -->|"HTTP 3001"| FRONTEND
    REVERSE -->|"HTTP 3000"| BACKEND
    
    FRONTEND <-->|"API REST / JSON"| BACKEND
    BACKEND <-->|"SQL / Sequelize"| DB
    FRONTEND -->|"Tuiles locales"| TILES
    
    USER -->|"Navigation"| REVERSE
    ADMIN -->|"Navigation Admin"| REVERSE
    
    BACKUP -.->|"Sauvegarde"| DB
    BACKUP -.->|"Sauvegarde"| FRONTEND

    %% Styles
    style INTERNET fill:#e3f2fd
    style FW fill:#ffcdd2
    style IDS fill:#ffccbc
    style WAF fill:#ffccbc
    style REVERSE fill:#fff9c4
    style USER fill:#e8f5e9
    style ADMIN fill:#fff3e0
    style FRONTEND fill:#c8e6c9
    style BACKEND fill:#a5d6a7
    style TILES fill:#dcedc8
    style DB fill:#f8bbd9
    style BACKUP fill:#f3e5f5
```

## Composants Techniques Détaillés

### 1. **Infrastructure Réseau**

| Composant | Technologie | Fonction | Localisation |
|-----------|-------------|----------|--------------|
| **Pare-feu** | À définir | Filtrage étatique, NAT, VPN | Périmètre réseau |
| **IDS/IPS** | À définir | Détection/prévention intrusion | Périmètre réseau |
| **WAF** | À définir | Protection applicative (OWASP) | DMZ |
| **Reverse Proxy** | Nginx | Load balancing, SSL termination | DMZ |

### 2. **Serveurs Applicatifs**

| Composant | Technologie | Version | IP:Port | Rôle |
|-----------|-------------|---------|---------|------|
| **Frontend** | React.js | 18.x | 10.28.8.236:3001 | Interface utilisateur |
| **Backend** | Next.js / Node.js | 13.x / 16.x | 10.28.8.236:3000 | API REST, métier |
| **Tuiles** | Fichiers PNG | - | Local | Fond de carte IGN |

### 3. **Base de Données**

| Composant | Technologie | Version | IP:Port | Données |
|-----------|-------------|---------|---------|---------|
| **PostgreSQL** | PostgreSQL + PostGIS | 14.x | 10.28.8.246:5432 | Données métier + géométries |
| **Schémas** | principale, urbanisme, enr, environnement, risques, autres | - | - | Segmentation données |

### 4. **Sécurité**

| Composant | Technologie | Fonction |
|-----------|-------------|----------|
| **Authentification** | JWT | Tokens signés, expiration 4h |
| **Audit** | Security Log | Traçabilité ANSSI conforme |
| **Chiffrement** | HTTPS / SSL | TLS 1.2+ |
| **Sauvegarde** | À définir | Backup quotidien BDD + fichiers |

### 5. **Supervision**

| Composant | Fonction |
|-----------|----------|
| **Logs applicatifs** | Fichiers logs Node.js (backend) |
| **Logs base de données** | Logs PostgreSQL |
| **Audit** | Table `security_log` en base de données |

## Interconnexions et Flux

### Flux Utilisateur Standard
```
Internet/RIE
    ↓ HTTPS 443
Pare-feu → IDS → WAF
    ↓
Reverse Proxy Nginx (DMZ)
    ↓ HTTP 3001
Frontend React.js
    ↓ API REST
Backend Next.js
    ↓ SQL 5432
PostgreSQL + PostGIS
```

### Flux Administration
```
Poste Admin
    ↓ HTTPS 443
Pare-feu (filtrage IP admin)
    ↓
Reverse Proxy Nginx
    ↓
Frontend Admin → Backend → Base de données
```

**Interface Admin** : Gestion des utilisateurs, logs de sécurité, snapshots projets.

### Flux Sauvegarde
```
Serveur Backup
    ↓
├── PostgreSQL (dump quotidien)
├── Fichiers tuiles (/tiles/)
└── Logs et configuration
```

## Éléments de Sécurité

### 1. **Cloisonnement Réseau**
- ✅ DMZ isolée du réseau interne
- ✅ Base de données sur réseau dédié (10.28.8.0/24)
- ✅ Pas d'accès direct Internet → BDD

### 2. **Défense en Profondeur**
- ✅ Pare-feu (filtrage réseau)
- ✅ IDS/IPS (détection menaces)
- ✅ WAF (protection applicative)
- ✅ Authentification JWT (contrôle accès)

### 3. **Conformité**
- ✅ Architecture cloisonnée (DMZ)
- ✅ Logs de sécurité (ANSSI)
- ✅ Données en France (DDT)
- ✅ Pas de dépendance externe (tuiles locales)

## Périmètre d'Homologation

Les composants couverts par l'homologation sont dans le cadre orange :
- 🔒 **Toute l'infrastructure** du schéma ci-dessus
- 🔒 **Données géographiques** (projets DDT)
- 🔒 **Données utilisateurs** (authentification)

---

**Note** : Les adresses IP en "Adresse XXX" sont des placeholders à remplacer par les valeurs réelles de l'infrastructure DDT.
