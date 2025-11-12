# 🔄 Migration du Système de Versioning

## ⚠️ IMPORTANT : Lisez ceci avant la migration

Ce guide vous aide à migrer la structure existante de `projet_snapshot` vers le nouveau système de versioning par section.

## 📊 Changements

### Anciennes colonnes (conservées)
- ✅ `id_snapshot` - Conservé
- ✅ `id_projet` - Conservé
- ✅ `description` - Conservé
- ✅ `created_at` - Conservé
- ⚠️ `snapshot_data` - Conservé mais optionnel (données migrées vers sections)
- ⚠️ `snapshot_type` - Conservé mais optionnel
- ⚠️ `created_by` - Conservé mais `user_id` en priorité

### Nouvelles colonnes ajoutées
- ✨ `user_id` - Utilisateur (requis pour nouveau système)
- ✨ `version_number` - Numéro de version (1-10)
- ✨ `snapshot_date` - Date du snapshot
- ✨ `is_current` - Marqueur de version courante

### Nouvelle table
- ✨ `projet_snapshot_section` - Sections individuelles par snapshot

## 🚀 Procédure de migration

### Étape 1 : Sauvegarde de la base de données

```bash
# Sauvegarder toute la base
pg_dump -U votre_utilisateur omega_ddt > backup_avant_migration.sql

# OU sauvegarder juste la table
pg_dump -U votre_utilisateur -t principale.projet_snapshot omega_ddt > backup_projet_snapshot.sql
```

### Étape 2 : Exécuter la migration

```bash
# Se connecter à la base
psql -U votre_utilisateur -d omega_ddt

# Exécuter le script de migration
\i backend/migrations/202511120002-update-versioning-system.sql

# OU en une ligne:
psql -U votre_utilisateur -d omega_ddt -f backend/migrations/202511120002-update-versioning-system.sql
```

### Étape 3 : Vérifier la migration

```sql
-- Vérifier la structure de projet_snapshot
\d principale.projet_snapshot

-- Vérifier que projet_snapshot_section existe
\d principale.projet_snapshot_section

-- Vérifier les données migrées
SELECT COUNT(*) FROM principale.projet_snapshot;
SELECT COUNT(*) FROM principale.projet_snapshot_section;
SELECT COUNT(*) FROM principale.projet_snapshot_backup; -- Table de backup

-- Vérifier que les fonctions sont créées
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'principale'
AND routine_name LIKE '%snapshot%';
```

### Étape 4 : Tester le nouveau système

```bash
# Tester la création d'un snapshot
curl -X POST http://localhost:3000/api/projets/snapshots/create \
  -H "Content-Type: application/json" \
  -d '{
    "id_projet": "PR-TEST-001",
    "user_id": 1,
    "sections": {
      "projet_info": {"nom": "Test", "description": "Test snapshot"}
    }
  }'

# Lister les snapshots
curl "http://localhost:3000/api/projets/snapshots/list?id_projet=PR-TEST-001&user_id=1"
```

## 🔍 Ce que fait la migration

### 1. Sauvegarde automatique
```sql
CREATE TABLE principale.projet_snapshot_backup AS
SELECT * FROM principale.projet_snapshot;
```
Une table de backup est créée automatiquement avec toutes les données existantes.

### 2. Ajout des nouvelles colonnes

- `user_id` : Copié depuis `created_by`
- `version_number` : Initialisé à 1, puis numéroté séquentiellement
- `snapshot_date` : Copié depuis `created_at`
- `is_current` : Les snapshots les plus récents marqués `true`

### 3. Migration des données

Les données de `snapshot_data` (JSONB) sont migrées vers la table `projet_snapshot_section` avec `section_name = 'projet_info'`.

### 4. Création des index

Tous les index pour optimiser les performances sont créés.

### 5. Fonctions et triggers

- `cleanup_old_snapshots()` : Nettoyage automatique > 15 jours
- `limit_user_snapshots()` : Limitation à 10 versions
- `get_next_version_number()` : Calcul du prochain numéro

## ⚡ Rollback (en cas de problème)

Si la migration échoue ou si vous voulez revenir en arrière :

```sql
BEGIN;

-- Supprimer les nouvelles colonnes
ALTER TABLE principale.projet_snapshot DROP COLUMN IF EXISTS user_id;
ALTER TABLE principale.projet_snapshot DROP COLUMN IF EXISTS version_number;
ALTER TABLE principale.projet_snapshot DROP COLUMN IF EXISTS snapshot_date;
ALTER TABLE principale.projet_snapshot DROP COLUMN IF EXISTS is_current;

-- Supprimer la nouvelle table
DROP TABLE IF EXISTS principale.projet_snapshot_section CASCADE;

-- Supprimer les fonctions
DROP FUNCTION IF EXISTS principale.cleanup_old_snapshots();
DROP FUNCTION IF EXISTS principale.limit_user_snapshots();
DROP FUNCTION IF EXISTS principale.get_next_version_number(VARCHAR, INTEGER);

-- Restaurer depuis le backup
TRUNCATE TABLE principale.projet_snapshot;
INSERT INTO principale.projet_snapshot
SELECT * FROM principale.projet_snapshot_backup;

COMMIT;
```

OU restaurer depuis le dump :

```bash
psql -U votre_utilisateur -d omega_ddt < backup_avant_migration.sql
```

## 🗑️ Nettoyage post-migration (optionnel)

Une fois que vous êtes sûr que tout fonctionne, vous pouvez supprimer :

### 1. La table de backup

```sql
DROP TABLE IF EXISTS principale.projet_snapshot_backup;
```

### 2. Les anciennes colonnes (ATTENTION - irréversible)

```sql
ALTER TABLE principale.projet_snapshot DROP COLUMN IF EXISTS snapshot_data;
ALTER TABLE principale.projet_snapshot DROP COLUMN IF EXISTS snapshot_type;
ALTER TABLE principale.projet_snapshot DROP COLUMN IF EXISTS created_by;
```

⚠️ **NE faites ceci QUE si** :
- Vous êtes sûr que le nouveau système fonctionne
- Aucun ancien code n'utilise ces colonnes
- Vous avez une sauvegarde complète

## 📊 Comparaison avant/après

### AVANT (ancienne structure)

```
projet_snapshot
├── id_snapshot
├── id_projet
├── snapshot_data (JSONB avec TOUTES les données)
├── snapshot_type (AUTO, MANUAL, BEFORE_DELETE)
├── description
├── created_by
└── created_at
```

### APRÈS (nouvelle structure)

```
projet_snapshot
├── id_snapshot
├── id_projet
├── user_id (nouveau)
├── version_number (nouveau, 1-10)
├── snapshot_date (nouveau)
├── is_current (nouveau)
├── description
├── snapshot_data (optionnel, conservé)
├── snapshot_type (optionnel, conservé)
├── created_by (optionnel, conservé)
└── created_at

projet_snapshot_section (nouvelle table)
├── id_section
├── id_snapshot
├── section_name (projet_info, porteurs, suivis, etc.)
├── section_data (JSONB)
└── created_at
```

## 🎯 Avantages du nouveau système

| Avant | Après |
|-------|-------|
| 1 snapshot = toutes les données en bloc | 1 snapshot = 6 sections séparées |
| Restauration tout ou rien | Restauration section par section |
| Pas de limite de versions | Max 10 versions par user |
| Pas de nettoyage automatique | Nettoyage auto après 15 jours |
| Pas de numérotation | Versions numérotées 1-10 |

## 🆘 Support

En cas de problème :

1. Vérifiez les logs PostgreSQL : `/var/log/postgresql/`
2. Vérifiez la table de backup : `SELECT * FROM principale.projet_snapshot_backup`
3. Consultez `VERSIONING_SYSTEM.md` pour l'utilisation
4. Rollback si nécessaire (voir section ci-dessus)

## ✅ Checklist finale

- [ ] Sauvegarde de la base effectuée
- [ ] Migration exécutée sans erreur
- [ ] Tables vérifiées (projet_snapshot + projet_snapshot_section)
- [ ] Fonctions SQL créées (3 fonctions)
- [ ] Trigger créé (trigger_limit_snapshots)
- [ ] Index créés (8 index)
- [ ] Test de création d'un snapshot réussi
- [ ] Test de listage des snapshots réussi
- [ ] Test de restauration réussi
- [ ] Backend redémarré avec nouveaux modèles
- [ ] Frontend testé

## 🚀 Prochaines étapes

Après la migration réussie :

1. **Intégrer dans le formulaire** : Appel automatique lors de la sauvegarde
2. **Créer l'UI** : Interface pour visualiser et restaurer les versions
3. **Configurer le cron** : Nettoyage automatique quotidien
4. **Former les utilisateurs** : Documentation utilisateur

Voir `VERSIONING_SYSTEM.md` pour les détails d'implémentation.
