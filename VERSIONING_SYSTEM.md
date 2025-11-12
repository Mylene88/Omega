# 📦 Système de Versioning des Projets

## Vue d'ensemble

Système complet de gestion des versions des projets avec sauvegarde granulaire par section et restauration sélective.

### Caractéristiques

- ✅ **10 versions maximum** par utilisateur par projet
- ✅ **Rétention de 15 jours** (suppression automatique après)
- ✅ **Sauvegarde par section** (restauration sélective possible)
- ✅ **Versioning par utilisateur** (chaque user a ses propres versions)
- ✅ **Rotation automatique** (version 1-10 en boucle)
- ✅ **Version courante** marquée (is_current = true)

## Sections sauvegardées

| Section | Contenu |
|---------|---------|
| `projet_info` | Nom, description, statut, dates, service DDT, etc. |
| `porteurs` | Liste des porteurs de projet avec leurs contacts |
| `suivis` | Historique des suivis DDT |
| `thematiques` | Thématiques et modèles associés |
| `documents` | Documents liés au projet |
| `geometrie` | Géométrie spatiale du projet |

## 🗄️ Structure de la base de données

### Table `projet_snapshot`

```sql
CREATE TABLE principale.projet_snapshot (
    id_snapshot SERIAL PRIMARY KEY,
    id_projet VARCHAR(20) REFERENCES principale.projet(id),
    user_id INTEGER REFERENCES principale.user(id_user),
    version_number INTEGER (1-10),
    snapshot_date TIMESTAMP,
    description TEXT,
    is_current BOOLEAN,
    created_at TIMESTAMP
);
```

### Table `projet_snapshot_section`

```sql
CREATE TABLE principale.projet_snapshot_section (
    id_section SERIAL PRIMARY KEY,
    id_snapshot INTEGER REFERENCES principale.projet_snapshot(id_snapshot),
    section_name ENUM('projet_info', 'porteurs', 'suivis', 'thematiques', 'documents', 'geometrie'),
    section_data JSONB,
    created_at TIMESTAMP
);
```

## 🔌 API Endpoints

### 1. Créer un snapshot

```http
POST /api/projets/snapshots/create
Content-Type: application/json

{
  "id_projet": "PR-2025-001",
  "user_id": 42,
  "description": "Avant modification des porteurs",
  "sections": {
    "projet_info": { "nom": "Mon projet", ... },
    "porteurs": [ { "nom_structure": "...", ... } ],
    "suivis": [ { "contenu": "...", ... } ],
    "thematiques": [ ... ],
    "documents": [ ... ],
    "geometrie": { "type": "Point", ... }
  }
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "Snapshot version 3 créé avec succès",
  "data": {
    "snapshot": {
      "id_snapshot": 156,
      "version_number": 3,
      "snapshot_date": "2025-11-12T10:30:00Z",
      "is_current": true,
      "sections_count": 6
    }
  }
}
```

### 2. Lister les snapshots d'un projet

```http
GET /api/projets/snapshots/list?id_projet=PR-2025-001&user_id=42
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "snapshots": [
      {
        "id_snapshot": 156,
        "version_number": 3,
        "snapshot_date": "2025-11-12T10:30:00Z",
        "description": "Avant modification des porteurs",
        "is_current": true,
        "created_by": {
          "id": 42,
          "username": "jdupont",
          "nom_complet": "Jean Dupont"
        },
        "sections": ["projet_info", "porteurs", "suivis", "thematiques", "documents", "geometrie"],
        "sections_count": 6
      },
      ...
    ],
    "total": 3
  }
}
```

### 3. Restaurer une section

```http
GET /api/projets/snapshots/restore/156/porteurs
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "snapshot_info": {
      "id_snapshot": 156,
      "version_number": 3,
      "snapshot_date": "2025-11-12T10:30:00Z",
      "description": "Avant modification des porteurs",
      "id_projet": "PR-2025-001"
    },
    "section_name": "porteurs",
    "section_data": [
      {
        "id_porteur": 1,
        "type_porteur_id": 2,
        "nom_structure": "Entreprise ABC",
        "referent_nom": "Dupont",
        ...
      }
    ]
  }
}
```

### 4. Restaurer plusieurs sections

```http
POST /api/projets/snapshots/restore
Content-Type: application/json

{
  "id_snapshot": 156,
  "sections": ["porteurs", "suivis"]
}
```

## 🔄 Intégration dans le formulaire

### Dans `FormulairePage.js`

```javascript
// Lors de la sauvegarde du projet
const handleSaveProject = async () => {
  // ... sauvegarde normale du projet ...

  // Créer un snapshot automatiquement
  await fetch('http://localhost:3000/api/projets/snapshots/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_projet: projetData.id_projet,
      user_id: currentUser.id_user,
      description: `Sauvegarde du ${new Date().toLocaleString()}`,
      sections: {
        projet_info: {
          nom: projetData.nom_projet,
          description: projetData.description,
          statut_projet_id: projetData.statut_projet_id,
          // ...
        },
        porteurs: porteursData,
        suivis: suiviData.historique,
        thematiques: thematiqueData,
        documents: documentsData,
        geometrie: geometryData
      }
    })
  });
};
```

## 🧹 Nettoyage automatique

### Exécution manuelle

```bash
cd backend
node scripts/cleanup-snapshots.js
```

### Configuration d'un cron job (Linux)

```bash
# Exécuter tous les jours à 2h du matin
crontab -e

# Ajouter cette ligne:
0 2 * * * cd /path/to/backend && node scripts/cleanup-snapshots.js >> /var/log/snapshot-cleanup.log 2>&1
```

### Configuration avec Node-Cron (dans l'application)

```javascript
// backend/server.js
const cron = require('node-cron');
const cleanupSnapshots = require('./scripts/cleanup-snapshots');

// Tous les jours à 2h du matin
cron.schedule('0 2 * * *', async () => {
  console.log('🧹 Lancement du nettoyage automatique des snapshots...');
  try {
    const deleted = await cleanupSnapshots();
    console.log(`✅ Nettoyage terminé: ${deleted} snapshot(s) supprimé(s)`);
  } catch (error) {
    console.error('❌ Erreur nettoyage:', error);
  }
});
```

## 📊 Exemples d'utilisation

### Scénario 1: Sauvegarde avant modification risquée

```javascript
// L'utilisateur va modifier des données critiques
await createSnapshot({
  id_projet: 'PR-2025-001',
  user_id: 42,
  description: 'Avant modification des thématiques',
  sections: { /* toutes les sections */ }
});
```

### Scénario 2: Restauration après erreur

```javascript
// Récupérer la liste des versions
const versions = await fetch('/api/projets/snapshots/list?id_projet=PR-2025-001&user_id=42');

// Restaurer la section porteurs de la version 2
const restored = await fetch('/api/projets/snapshots/restore/145/porteurs');

// Appliquer au formulaire
setPorteursData(restored.data.section_data);
```

### Scénario 3: Comparaison de versions

```javascript
// Récupérer deux versions
const v1 = await fetch('/api/projets/snapshots/restore/140/porteurs');
const v2 = await fetch('/api/projets/snapshots/restore/145/porteurs');

// Afficher les différences
const diff = compareSections(v1.data.section_data, v2.data.section_data);
```

## 🔒 Sécurité

- ✅ Chaque utilisateur ne voit que ses propres versions
- ✅ Validation des sections lors de la restauration
- ✅ Cascade delete (suppression des sections si snapshot supprimé)
- ✅ Contraintes d'unicité pour éviter les doublons
- ✅ Limitation automatique à 10 versions par trigger SQL

## 📈 Performance

### Index créés

- `idx_snapshot_projet` : Recherche par projet
- `idx_snapshot_user` : Recherche par utilisateur
- `idx_snapshot_date` : Tri par date (nettoyage)
- `idx_snapshot_projet_user` : Recherche composite
- `idx_snapshot_current` : Recherche des versions courantes
- `idx_section_snapshot` : Join snapshots ↔ sections
- `idx_section_data` : Recherche dans le JSON (GIN)

### Optimisations

- Trigger automatique pour limiter à 10 versions
- Suppression en cascade des sections
- Stockage JSON pour flexibilité et performance
- Index GIN pour recherche dans les données JSON

## 🐛 Dépannage

### Les snapshots ne sont pas supprimés après 15 jours

Vérifier que le cron job fonctionne :
```bash
# Tester manuellement
node scripts/cleanup-snapshots.js

# Vérifier les logs cron
tail -f /var/log/snapshot-cleanup.log
```

### Impossible de créer plus de 10 versions

C'est normal ! Le système garde max 10 versions et réutilise les numéros en boucle (1→10→1).

### Une section ne se restaure pas

Vérifier que la section existe dans le snapshot :
```sql
SELECT * FROM principale.projet_snapshot_section
WHERE id_snapshot = 156 AND section_name = 'porteurs';
```

## 📝 Notes de développement

- Les données JSON sont stockées au format PostgreSQL JSONB (performance optimale)
- La suppression est en cascade (sections supprimées si snapshot supprimé)
- Le trigger `limit_user_snapshots` limite automatiquement à 10 versions
- La fonction `cleanup_old_snapshots()` peut être appelée en SQL directement

## 🚀 Prochaines améliorations possibles

- [ ] Interface UI pour visualiser les versions
- [ ] Comparaison visuelle entre versions
- [ ] Export des versions en JSON
- [ ] Import de versions depuis JSON
- [ ] Tags personnalisés sur les versions
- [ ] Commentaires sur les versions
