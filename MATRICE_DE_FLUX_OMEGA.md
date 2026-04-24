# Matrice de Flux OMEGA

## Structure du tableau

| Réf. | Nom du flux | Description | Équipement src | URL src | IP src | Masque src | VLAN src | Hébergement src | Équipement dest | URL dest | IP dest | Masque dest | VLAN dest | Hébergement dest | Protocole |
|------|-------------|-------------|----------------|---------|--------|------------|----------|-----------------|-----------------|----------|---------|-------------|-----------|------------------|-----------|

## Flux OMEGA

### Flux 1 : Accès Utilisateur (Internet → Application)
| Champ | Valeur |
|-------|--------|
| **Réf.** | FLUX-001 |
| **Nom du flux** | Accès utilisateur HTTPS |
| **Description** | Les agents DDT accèdent à l'application OMEGA via leur navigateur web |
| **Équipement src** | Postes Utilisateurs DDT |
| **URL src** | - |
| **IP src** | 10.28.8.1-126 |
| **Masque src** | /25 |
| **VLAN src** | VLAN Utilisateurs |
| **Hébergement src** | Site 2 - Bureaux |
| **Équipement dest** | Reverse Proxy Nginx |
| **URL dest** | https://omega.ddt.fr |
| **IP dest** | Adresse DMZ |
| **Masque dest** | - |
| **VLAN dest** | DMZ |
| **Hébergement dest** | Site 1 - Datacenter |
| **Protocole** | HTTPS 443 |

---

### Flux 2 : Navigation Frontend → Backend
| Champ | Valeur |
|-------|--------|
| **Réf.** | FLUX-002 |
| **Nom du flux** | API REST Frontend-Backend |
| **Description** | Le frontend React appelle l'API backend pour récupérer les données |
| **Équipement src** | Frontend OMEGA |
| **URL src** | http://localhost:3001 |
| **IP src** | 10.28.8.236 |
| **Masque src** | /32 |
| **VLAN src** | Réseau Interne DDT |
| **Hébergement src** | Site 1 - Datacenter |
| **Équipement dest** | Backend OMEGA |
| **URL dest** | http://localhost:3000 |
| **IP dest** | 10.28.8.236 |
| **Masque dest** | /32 |
| **VLAN dest** | Réseau Interne DDT |
| **Hébergement dest** | Site 1 - Datacenter |
| **Protocole** | HTTP 3000 (API REST/JSON) |

---

### Flux 3 : Backend → Base de Données
| Champ | Valeur |
|-------|--------|
| **Réf.** | FLUX-003 |
| **Nom du flux** | Requêtes SQL Base de Données |
| **Description** | Le backend interroge PostgreSQL pour lire/écrire les données |
| **Équipement src** | Backend OMEGA |
| **URL src** | http://localhost:3000 |
| **IP src** | 10.28.8.236 |
| **Masque src** | /32 |
| **VLAN src** | Réseau Interne DDT |
| **Hébergement src** | Site 1 - Datacenter |
| **Équipement dest** | PostgreSQL + PostGIS |
| **URL dest** | - |
| **IP dest** | 10.28.8.246 |
| **Masque dest** | /32 |
| **VLAN dest** | Réseau Interne DDT |
| **Hébergement dest** | Site 1 - Datacenter |
| **Protocole** | SQL 5432 (TLS 1.3) |

---

### Flux 4 : Chargement Tuiles Cartographiques
| Champ | Valeur |
|-------|--------|
| **Réf.** | FLUX-004 |
| **Nom du flux** | Chargement tuiles IGN locales |
| **Description** | Le frontend charge les tuiles cartographiques depuis le stockage local |
| **Équipement src** | Frontend OMEGA |
| **URL src** | http://localhost:3001 |
| **IP src** | 10.28.8.236 |
| **Masque src** | /32 |
| **VLAN src** | Réseau Interne DDT |
| **Hébergement src** | Site 1 - Datacenter |
| **Équipement dest** | Stockage local Tuiles IGN |
| **URL dest** | /tiles/plan/ + /tiles/ortho/ |
| **IP dest** | 10.28.8.236 |
| **Masque dest** | /32 |
| **VLAN dest** | Réseau Interne DDT |
| **Hébergement dest** | Site 1 - Datacenter |
| **Protocole** | HTTP (fichiers locaux) |

---

### Flux 5 : Administration SSH
| Champ | Valeur |
|-------|--------|
| **Réf.** | FLUX-005 |
| **Nom du flux** | Administration SSH |
| **Description** | Les administrateurs se connectent en SSH pour gérer le serveur |
| **Équipement src** | Postes Admin |
| **URL src** | - |
| **IP src** | 10.28.8.129-254 |
| **Masque src** | /25 |
| **VLAN src** | VLAN Administration |
| **Hébergement src** | Site 1 - Datacenter |
| **Équipement dest** | Serveur Applicatif OMEGA |
| **URL dest** | - |
| **IP dest** | 10.28.8.236 |
| **Masque dest** | /32 |
| **VLAN dest** | Réseau Interne DDT |
| **Hébergement dest** | Site 1 - Datacenter |
| **Protocole** | SSH 22 (clés publiques) |

---

### Flux 6 : Sauvegarde Base de Données
| Champ | Valeur |
|-------|--------|
| **Réf.** | FLUX-006 |
| **Nom du flux** | Sauvegarde PostgreSQL |
| **Description** | Le serveur backup effectue les dumps quotidiens de la base de données |
| **Équipement src** | Serveur Backup |
| **URL src** | - |
| **IP src** | Adresse Backup |
| **Masque src** | - |
| **VLAN src** | Services Support |
| **Hébergement src** | Site 1 - Datacenter |
| **Équipement dest** | PostgreSQL + PostGIS |
| **URL dest** | - |
| **IP dest** | 10.28.8.246 |
| **Masque dest** | /32 |
| **VLAN dest** | Réseau Interne DDT |
| **Hébergement dest** | Site 1 - Datacenter |
| **Protocole** | pg_dump / rsync |

---

### Flux 7 : Proxy Nginx → Frontend
| Champ | Valeur |
|-------|--------|
| **Réf.** | FLUX-007 |
| **Nom du flux** | Reverse Proxy vers Frontend |
| **Description** | Nginx redirige les requêtes utilisateur vers le frontend React |
| **Équipement src** | Reverse Proxy Nginx |
| **URL src** | https://omega.ddt.fr |
| **IP src** | Adresse DMZ |
| **Masque src** | - |
| **VLAN src** | DMZ |
| **Hébergement src** | Site 1 - Datacenter |
| **Équipement dest** | Frontend OMEGA |
| **URL dest** | http://localhost:3001 |
| **IP dest** | 10.28.8.236 |
| **Masque dest** | /32 |
| **VLAN dest** | Réseau Interne DDT |
| **Hébergement dest** | Site 1 - Datacenter |
| **Protocole** | HTTP 3001 |

---

## Récapitulatif des Flux

| Réf. | Source → Destination | Protocole | Usage |
|------|---------------------|-----------|-------|
| FLUX-001 | Utilisateurs → Nginx | HTTPS 443 | Navigation web |
| FLUX-002 | Frontend → Backend | HTTP 3000 | API REST |
| FLUX-003 | Backend → PostgreSQL | SQL 5432 | Données |
| FLUX-004 | Frontend → Tuiles locales | HTTP | Cartographie |
| FLUX-005 | Admin → Serveur | SSH 22 | Administration |
| FLUX-006 | Backup → PostgreSQL | pg_dump | Sauvegarde |
| FLUX-007 | Nginx → Frontend | HTTP 3001 | Proxy |
