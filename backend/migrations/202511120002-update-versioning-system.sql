-- ============================================================
-- MIGRATION: Mise à jour du système de versioning existant
-- Date: 2025-11-12
-- Description: Transformation de projet_snapshot pour le versioning par section
-- ============================================================

BEGIN;

-- ============================================================
-- ÉTAPE 1: Sauvegarder les données existantes (optionnel)
-- ============================================================
-- Créer une table de backup temporaire
CREATE TABLE IF NOT EXISTS principale.projet_snapshot_backup AS
SELECT * FROM principale.projet_snapshot;

RAISE NOTICE 'Sauvegarde créée: % snapshots existants', (SELECT COUNT(*) FROM principale.projet_snapshot_backup);

-- ============================================================
-- ÉTAPE 2: Modifier la table projet_snapshot
-- ============================================================

-- Ajouter la colonne user_id (renommer created_by)
ALTER TABLE principale.projet_snapshot
    ADD COLUMN IF NOT EXISTS user_id INTEGER;

-- Migrer les données de created_by vers user_id
UPDATE principale.projet_snapshot
SET user_id = created_by
WHERE user_id IS NULL;

-- Ajouter la contrainte FK pour user_id
ALTER TABLE principale.projet_snapshot
    ADD CONSTRAINT fk_snapshot_user
    FOREIGN KEY (user_id)
    REFERENCES principale.user(id_user)
    ON DELETE CASCADE;

-- Rendre user_id NOT NULL après migration
ALTER TABLE principale.projet_snapshot
    ALTER COLUMN user_id SET NOT NULL;

-- Ajouter version_number
ALTER TABLE principale.projet_snapshot
    ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;

-- Ajouter snapshot_date
ALTER TABLE principale.projet_snapshot
    ADD COLUMN IF NOT EXISTS snapshot_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Migrer created_at vers snapshot_date pour les anciennes données
UPDATE principale.projet_snapshot
SET snapshot_date = created_at
WHERE snapshot_date IS NULL;

-- Ajouter is_current
ALTER TABLE principale.projet_snapshot
    ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT false;

-- Marquer les snapshots les plus récents comme courants
WITH latest_snapshots AS (
    SELECT DISTINCT ON (id_projet, user_id)
        id_snapshot
    FROM principale.projet_snapshot
    ORDER BY id_projet, user_id, created_at DESC
)
UPDATE principale.projet_snapshot
SET is_current = true
WHERE id_snapshot IN (SELECT id_snapshot FROM latest_snapshots);

-- Ajouter la contrainte unique pour version_number
ALTER TABLE principale.projet_snapshot
    DROP CONSTRAINT IF EXISTS unique_project_user_version;

ALTER TABLE principale.projet_snapshot
    ADD CONSTRAINT unique_project_user_version
    UNIQUE(id_projet, user_id, version_number);

-- ============================================================
-- ÉTAPE 3: Migrer les données de snapshot_data vers sections
-- ============================================================

-- Créer la table projet_snapshot_section
CREATE TABLE IF NOT EXISTS principale.projet_snapshot_section (
    id_section SERIAL PRIMARY KEY,
    id_snapshot INTEGER NOT NULL,
    section_name VARCHAR(50) NOT NULL,
    section_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Contraintes
    CONSTRAINT unique_snapshot_section UNIQUE(id_snapshot, section_name),
    CONSTRAINT valid_section_name CHECK (
        section_name IN ('projet_info', 'porteurs', 'suivis', 'thematiques', 'documents', 'geometrie')
    )
);

-- Ajouter la contrainte FK APRÈS avoir créé les données
ALTER TABLE principale.projet_snapshot_section
    ADD CONSTRAINT fk_section_snapshot
    FOREIGN KEY (id_snapshot)
    REFERENCES principale.projet_snapshot(id_snapshot)
    ON DELETE CASCADE;

-- Migrer les données existantes de snapshot_data vers section 'projet_info'
-- (On crée une section unique avec toutes les anciennes données)
INSERT INTO principale.projet_snapshot_section (id_snapshot, section_name, section_data)
SELECT
    id_snapshot,
    'projet_info' as section_name,
    snapshot_data
FROM principale.projet_snapshot
WHERE snapshot_data IS NOT NULL
ON CONFLICT (id_snapshot, section_name) DO NOTHING;

RAISE NOTICE 'Données migrées vers projet_snapshot_section';

-- ============================================================
-- ÉTAPE 4: Nettoyer les anciennes colonnes (OPTIONNEL - commenté pour sécurité)
-- ============================================================

-- Décommenter ces lignes si vous êtes sûr de ne plus avoir besoin de ces colonnes :

-- ALTER TABLE principale.projet_snapshot DROP COLUMN IF EXISTS snapshot_data;
-- ALTER TABLE principale.projet_snapshot DROP COLUMN IF EXISTS snapshot_type;
-- ALTER TABLE principale.projet_snapshot DROP COLUMN IF EXISTS created_by;

-- Pour l'instant, on garde ces colonnes pour compatibilité
-- Vous pourrez les supprimer manuellement plus tard

-- ============================================================
-- ÉTAPE 5: Créer les index pour performances
-- ============================================================

-- Index pour rechercher les snapshots par projet
CREATE INDEX IF NOT EXISTS idx_snapshot_projet ON principale.projet_snapshot(id_projet);

-- Index pour rechercher les snapshots par utilisateur
CREATE INDEX IF NOT EXISTS idx_snapshot_user ON principale.projet_snapshot(user_id);

-- Index pour rechercher par date (pour le nettoyage)
CREATE INDEX IF NOT EXISTS idx_snapshot_date ON principale.projet_snapshot(snapshot_date DESC);

-- Index composite pour recherche projet + user
CREATE INDEX IF NOT EXISTS idx_snapshot_projet_user
ON principale.projet_snapshot(id_projet, user_id, version_number DESC);

-- Index pour rechercher les versions courantes
CREATE INDEX IF NOT EXISTS idx_snapshot_current
ON principale.projet_snapshot(id_projet, is_current)
WHERE is_current = true;

-- Index pour rechercher les sections par snapshot
CREATE INDEX IF NOT EXISTS idx_section_snapshot
ON principale.projet_snapshot_section(id_snapshot);

-- Index pour rechercher par type de section
CREATE INDEX IF NOT EXISTS idx_section_name
ON principale.projet_snapshot_section(section_name);

-- Index GIN pour recherche dans les données JSON
CREATE INDEX IF NOT EXISTS idx_section_data
ON principale.projet_snapshot_section USING GIN(section_data);

-- ============================================================
-- ÉTAPE 6: Ajouter les commentaires
-- ============================================================

COMMENT ON TABLE principale.projet_snapshot IS
'Métadonnées des versions sauvegardées. Max 10 versions par utilisateur, rétention 15 jours.';

COMMENT ON COLUMN principale.projet_snapshot.version_number IS
'Numéro de version (1-10). La version 10 est la plus récente.';

COMMENT ON COLUMN principale.projet_snapshot.is_current IS
'Indique si c''est la dernière version sauvegardée (version courante).';

COMMENT ON COLUMN principale.projet_snapshot.user_id IS
'Utilisateur ayant créé ce snapshot (remplace created_by)';

COMMENT ON TABLE principale.projet_snapshot_section IS
'Données par section pour chaque snapshot. Permet la restauration sélective.';

COMMENT ON COLUMN principale.projet_snapshot_section.section_name IS
'Type de section: projet_info, porteurs, suivis, thematiques, documents, geometrie';

COMMENT ON COLUMN principale.projet_snapshot_section.section_data IS
'Données de la section au format JSON. Structure dépend du type de section.';

-- ============================================================
-- ÉTAPE 7: Créer les fonctions SQL
-- ============================================================

-- Fonction: Nettoyer les anciennes versions (> 15 jours)
CREATE OR REPLACE FUNCTION principale.cleanup_old_snapshots()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Supprimer les snapshots de plus de 15 jours qui ne sont pas la version courante
    WITH deleted AS (
        DELETE FROM principale.projet_snapshot
        WHERE snapshot_date < CURRENT_TIMESTAMP - INTERVAL '15 days'
        AND is_current = false
        RETURNING id_snapshot
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;

    -- Log le nettoyage
    RAISE NOTICE 'Nettoyé % snapshots de plus de 15 jours', deleted_count;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION principale.cleanup_old_snapshots IS
'Nettoie automatiquement les snapshots de plus de 15 jours (sauf version courante)';

-- Fonction: Limiter à 10 versions par utilisateur
CREATE OR REPLACE FUNCTION principale.limit_user_snapshots()
RETURNS TRIGGER AS $$
BEGIN
    -- Supprimer les versions excédentaires (garder seulement les 10 plus récentes)
    DELETE FROM principale.projet_snapshot
    WHERE id_snapshot IN (
        SELECT id_snapshot
        FROM principale.projet_snapshot
        WHERE id_projet = NEW.id_projet
        AND user_id = NEW.user_id
        ORDER BY version_number DESC
        OFFSET 10
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION principale.limit_user_snapshots IS
'Trigger: Limite automatiquement à 10 versions par utilisateur par projet';

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_limit_snapshots ON principale.projet_snapshot;
CREATE TRIGGER trigger_limit_snapshots
    AFTER INSERT ON principale.projet_snapshot
    FOR EACH ROW
    EXECUTE FUNCTION principale.limit_user_snapshots();

-- Fonction: Obtenir le prochain numéro de version
CREATE OR REPLACE FUNCTION principale.get_next_version_number(
    p_id_projet VARCHAR(20),
    p_user_id INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    max_version INTEGER;
BEGIN
    -- Obtenir le numéro de version max actuel
    SELECT COALESCE(MAX(version_number), 0) INTO max_version
    FROM principale.projet_snapshot
    WHERE id_projet = p_id_projet
    AND user_id = p_user_id;

    -- Incrémenter (max 10)
    IF max_version >= 10 THEN
        -- Réutiliser le numéro 1 (rotation)
        RETURN 1;
    ELSE
        RETURN max_version + 1;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION principale.get_next_version_number IS
'Retourne le prochain numéro de version (1-10) pour un projet/utilisateur';

-- ============================================================
-- ÉTAPE 8: Mettre à jour les numéros de version existants
-- ============================================================

-- Assigner des numéros de version séquentiels aux snapshots existants
WITH numbered_snapshots AS (
    SELECT
        id_snapshot,
        ROW_NUMBER() OVER (
            PARTITION BY id_projet, user_id
            ORDER BY created_at ASC
        ) as new_version_number
    FROM principale.projet_snapshot
)
UPDATE principale.projet_snapshot ps
SET version_number = LEAST(ns.new_version_number, 10)
FROM numbered_snapshots ns
WHERE ps.id_snapshot = ns.id_snapshot;

RAISE NOTICE 'Numéros de version assignés aux snapshots existants';

COMMIT;

-- ============================================================
-- VÉRIFICATIONS POST-MIGRATION
-- ============================================================

DO $$
DECLARE
    snapshot_count INTEGER;
    section_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO snapshot_count FROM principale.projet_snapshot;
    SELECT COUNT(*) INTO section_count FROM principale.projet_snapshot_section;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION TERMINÉE AVEC SUCCÈS !';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Snapshots dans la base: %', snapshot_count;
    RAISE NOTICE 'Sections créées: %', section_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Anciennes colonnes conservées pour compatibilité:';
    RAISE NOTICE '  - snapshot_data';
    RAISE NOTICE '  - snapshot_type';
    RAISE NOTICE '  - created_by';
    RAISE NOTICE 'Vous pouvez les supprimer manuellement si nécessaire.';
    RAISE NOTICE '========================================';
END $$;
