# Système de Demande de Suppression de Projets

## Vue d'ensemble

Ce système permet aux utilisateurs de demander la suppression d'un projet. Seuls les administrateurs peuvent approuver ou rejeter ces demandes et effectuer la suppression.

## Workflow

```
┌─────────────────┐
│  Utilisateur    │
│  clique sur 🗑️  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  Modal s'ouvre              │
│  Demande raison (min 10 car)│
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  POST /api/deletion-requests│
│  Statut: pending            │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Admin examine la demande   │
│  Interface admin            │
└────────┬────────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐  ┌─────────┐
│Approuver│  │Rejeter  │
└────┬───┘  └────┬────┘
     │           │
     ▼           ▼
┌─────────┐   ┌──────────────┐
│Projet   │   │Demande       │
│supprimé │   │marquée       │
│         │   │rejected      │
└─────────┘   └──────────────┘
```

## Composants créés

### 1. Base de données

**Table** : `principale.projet_deletion_request`

| Champ | Type | Description |
|-------|------|-------------|
| id_deletion_request | INTEGER | ID unique de la demande |
| id_projet | INTEGER | ID du projet à supprimer |
| requested_by | INTEGER | ID de l'utilisateur demandeur |
| raison | TEXT | Raison de la suppression (min 10 caractères) |
| statut | ENUM | pending, approved, rejected |
| reviewed_by | INTEGER | ID de l'admin qui a traité la demande |
| review_comment | TEXT | Commentaire de l'admin |
| reviewed_at | DATE | Date de révision |
| created_at | DATE | Date de création de la demande |

**Migration** : `backend/migrations/202511070002-create-deletion-requests.js`

### 2. Modèle Sequelize

**Fichier** : `backend/models/projetDeletionRequest.js`

Relations :
- `belongsTo` Projet (via id_projet)
- `belongsTo` User (requestor via requested_by)
- `belongsTo` User (reviewer via reviewed_by)

### 3. Routes API

#### POST /api/deletion-requests
Créer une nouvelle demande de suppression

**Body:**
```json
{
  "id_projet": 123,
  "requested_by": 1,
  "raison": "Ce projet est obsolète et ne correspond plus aux critères..."
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Demande de suppression créée avec succès",
  "data": {
    "id": 45,
    "id_projet": 123,
    "statut": "pending",
    "created_at": "2025-11-07T10:30:00Z"
  }
}
```

**Erreurs possibles:**
- 400: Données manquantes ou raison trop courte
- 404: Projet non trouvé
- 409: Demande déjà en attente pour ce projet

#### GET /api/deletion-requests
Récupérer les demandes de suppression

**Query params:**
- `user_id`: ID de l'utilisateur (pour filtrer ses demandes)
- `is_admin`: true/false (pour voir toutes les demandes ou seulement les siennes)
- `statut`: pending/approved/rejected

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 45,
      "id_projet": 123,
      "projet_nom": "Projet XYZ",
      "raison": "Ce projet est obsolète...",
      "statut": "pending",
      "requested_by": {
        "id": 1,
        "username": "jdupont",
        "nom_complet": "Jean Dupont"
      },
      "reviewed_by": null,
      "review_comment": null,
      "reviewed_at": null,
      "created_at": "2025-11-07T10:30:00Z"
    }
  ],
  "total": 1
}
```

#### PATCH /api/deletion-requests/[id]
Approuver ou rejeter une demande (Admin uniquement)

**Body:**
```json
{
  "action": "approve",  // ou "reject"
  "reviewed_by": 2,
  "review_comment": "Demande justifiée, projet obsolète"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Demande approuvée et projet supprimé",
  "data": {
    "id": 45,
    "statut": "approved",
    "reviewed_at": "2025-11-07T11:00:00Z"
  }
}
```

**Erreurs possibles:**
- 400: Action invalide
- 404: Demande non trouvée
- 409: Demande déjà traitée

#### DELETE /api/deletion-requests/[id]
Annuler sa propre demande (User)

**Query params:**
- `user_id`: ID de l'utilisateur

**Contraintes:**
- L'utilisateur ne peut annuler que ses propres demandes
- Seulement les demandes avec statut "pending"

### 4. Frontend

#### Composant DeletionRequestModal

**Fichier** : `frontend/src/visualisation/components/common/DeletionRequestModal.js`

**Props:**
- `projet`: Objet projet à supprimer
- `onClose`: Fonction pour fermer le modal
- `onSubmit`: Fonction appelée avec la raison en paramètre

**Features:**
- Validation: minimum 10 caractères
- Compteur de caractères
- Messages d'erreur
- État de chargement
- Responsive

#### Intégration dans VueListe

**Fichier** : `frontend/src/visualisation/components/VueListe.js`

**Ajouts:**
- Bouton 🗑️ dans le header de chaque carte
- Modal conditionnel
- Gestion de l'état `deletionModalOpen` et `projectToDelete`
- Fonction `handleDeletionSubmit` pour envoyer la demande

**CSS:**
```css
.delete-btn-header {
  /* Bouton rouge avec icône poubelle */
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fca5a5;
}
```

## Utilisation

### Pour les utilisateurs

1. **Demander une suppression:**
   - Cliquer sur l'icône 🗑️ sur une carte de projet
   - Un modal s'ouvre
   - Remplir la raison (minimum 10 caractères)
   - Cliquer sur "Soumettre la demande"
   - Un message de confirmation s'affiche

2. **Voir ses demandes:**
   ```javascript
   GET /api/deletion-requests?user_id=1&is_admin=false
   ```

3. **Annuler une demande:**
   ```javascript
   DELETE /api/deletion-requests/45?user_id=1
   ```

### Pour les administrateurs

1. **Voir toutes les demandes en attente:**
   ```javascript
   GET /api/deletion-requests?is_admin=true&statut=pending
   ```

2. **Approuver une demande:**
   ```javascript
   PATCH /api/deletion-requests/45
   Body: {
     "action": "approve",
     "reviewed_by": 2,
     "review_comment": "Approuvé"
   }
   ```
   ⚠️ **Cette action supprime définitivement le projet !**

3. **Rejeter une demande:**
   ```javascript
   PATCH /api/deletion-requests/45
   Body: {
     "action": "reject",
     "reviewed_by": 2,
     "review_comment": "Le projet est encore nécessaire"
   }
   ```

## Sécurité

- ✅ Validation côté serveur (raison minimum 10 caractères)
- ✅ Vérification de l'existence du projet
- ✅ Prévention des doublons (une seule demande pending par projet)
- ✅ Isolation des demandes par utilisateur (sauf admin)
- ✅ Transactions pour la suppression
- ✅ Cascade delete sur les relations

## Installation

1. **Exécuter la migration:**
   ```bash
   cd backend
   node -e "
     const db = require('./models');
     (async () => {
       await db.sequelize.query(\`
         -- Contenu du fichier migration
       \`);
       await db.sequelize.close();
     })();
   "
   ```

2. **Redémarrer le serveur backend**

3. **L'interface est automatiquement disponible sur la Vue Liste**

## Interface Admin

L'interface admin a été créée et est complètement fonctionnelle :

- ✅ Onglet "Demandes de suppression" dans les pages admin
- ✅ Liste des demandes avec filtres par statut (en attente/accepter/refuser)
- ✅ Boutons Approuver/Rejeter avec confirmations
- ✅ Modal de confirmation avant suppression avec détails du projet
- ✅ Historique complet des demandes traitées
- ✅ Champ commentaire optionnel pour l'admin lors de la révision
- ✅ Affichage des informations du demandeur et du reviewer
- ✅ Statistiques rapides (total, en attente)
- ✅ Bouton d'actualisation manuelle

### Accès

L'interface est disponible dans les deux versions de la page admin :
- `/admin` - AdminPage.js (version simple)
- `/admin/enhanced` - AdminPageEnhanced.js (version améliorée avec auto-refresh)

### Fonctionnalités

**Filtrage**:
- Tous les statuts
- En attente uniquement
- Approuvées uniquement
- Rejetées uniquement

**Actions (pour demandes en attente)**:
- Rejeter : Change le statut à "refuser"
- Approuver et supprimer : Change le statut à "accepter" et supprime le projet

**Modal de confirmation**:
- Pour les approbations : Affiche un avertissement et les détails du projet
- Pour les rejets : Confirmation simple
- Champ commentaire optionnel dans les deux cas

**Affichage des informations**:
- ID de la demande et du projet
- Nom du projet et description
- Demandeur (nom complet ou username)
- Raison de la demande
- Date de création
- Pour les demandes traitées : reviewer, date de révision, commentaire

## Fichiers créés

```
backend/
  ├── migrations/
  │   └── 202511070002-create-deletion-requests.js
  ├── models/
  │   └── principale.js (modifié - ajout ProjetDeletionRequest)
  ├── scripts/
  │   └── create-deletion-request-table.sql
  └── app/api/
      └── deletion-requests/
          ├── route.js (GET, POST)
          └── [id]/
              └── route.js (PATCH, DELETE)

frontend/src/
  ├── vizualisation/
  │   ├── components/
  │   │   ├── common/
  │   │   │   └── DeletionRequestModal.js
  │   │   └── VueListe.js (modifié)
  │   └── styles/
  │       ├── DeletionRequestModal.css
  │       └── VueListeStyle.css (modifié)
  ├── components/admin/
  │   ├── DeletionRequestsTab.js
  │   └── DeletionRequestsTab.css
  └── pages/Admin/
      ├── AdminPage.js (modifié - ajout onglet)
      └── AdminPageEnhanced.js (modifié - ajout onglet)

documentation/
  └── DELETION_SYSTEM.md
```

## Notes

- Le système est extensible pour ajouter des notifications
- Peut être adapté pour d'autres types de ressources
- Les commentaires de révision sont optionnels mais recommandés
