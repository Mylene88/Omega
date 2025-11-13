-- ============================================================
-- CRÉATION DU SYSTÈME DE VERSIONING COMPLET
-- Date: 2025-11-12
-- Description: Tables pour versioning avec 10 versions max par user
-- ============================================================

BEGIN;

-- ============================================================
-- Table 1: projet_snapshot
-- Description: Métadonnées des versions sauvegardées
-- ============================================================
CREATE TABLE IF NOT EXISTS principale.projet_snapshot (
    id_snapshot SERIAL PRIMARY KEY,
    id_projet VARCHAR(255) NOT NULL REFERENCES principale.projet(id_projet) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES principale.user(id_user) ON DELETE CASCADE,
    version_number INTEGER NOT NULL CHECK (version_number >= 1 AND version_number <= 10),
    snapshot_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Contrainte: max 10 versions par projet/utilisateur
    CONSTRAINT unique_project_user_version UNIQUE(id_projet, user_id, version_number)
);

-- ============================================================
-- Table 2: projet_snapshot_section
-- Description: Données par section pour chaque snapshot
-- ============================================================
CREATE TABLE IF NOT EXISTS principale.projet_snapshot_section (
    id_section SERIAL PRIMARY KEY,
    id_snapshot INTEGER NOT NULL REFERENCES principale.projet_snapshot(id_snapshot) ON DELETE CASCADE,
    section_name VARCHAR(50) NOT NULL,
    section_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Contraintes
    CONSTRAINT unique_snapshot_section UNIQUE(id_snapshot, section_name),
    CONSTRAINT valid_section_name CHECK (
        section_name IN ('projet_info', 'porteurs', 'suivis', 'thematiques', 'documents', 'geometrie')
    )
);

-- ============================================================
-- INDEX POUR PERFORMANCES
-- ============================================================

-- Index pour projet_snapshot
CREATE INDEX IF NOT EXISTS idx_snapshot_projet ON principale.projet_snapshot(id_projet);
CREATE INDEX IF NOT EXISTS idx_snapshot_user ON principale.projet_snapshot(user_id);
CREATE INDEX IF NOT EXISTS idx_snapshot_date ON principale.projet_snapshot(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_snapshot_projet_user
    ON principale.projet_snapshot(id_projet, user_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_snapshot_current
    ON principale.projet_snapshot(id_projet, is_current)
    WHERE is_current = true;

-- Index pour projet_snapshot_section
CREATE INDEX IF NOT EXISTS idx_section_snapshot ON principale.projet_snapshot_section(id_snapshot);
CREATE INDEX IF NOT EXISTS idx_section_name ON principale.projet_snapshot_section(section_name);
CREATE INDEX IF NOT EXISTS idx_section_data
    ON principale.projet_snapshot_section USING GIN(section_data);

-- ============================================================
-- COMMENTAIRES
-- ============================================================

COMMENT ON TABLE principale.projet_snapshot IS
'Métadonnées des versions sauvegardées. Max 10 versions par utilisateur, rétention 15 jours.';

COMMENT ON COLUMN principale.projet_snapshot.version_number IS
'Numéro de version (1-10). Les anciennes versions sont supprimées automatiquement.';

COMMENT ON COLUMN principale.projet_snapshot.is_current IS
'Indique si c''est la dernière version sauvegardée (version courante).';

COMMENT ON TABLE principale.projet_snapshot_section IS
'Données par section pour chaque snapshot. Permet la restauration sélective.';

COMMENT ON COLUMN principale.projet_snapshot_section.section_name IS
'Type de section: projet_info, porteurs, suivis, thematiques, documents, geometrie';

COMMENT ON COLUMN principale.projet_snapshot_section.section_data IS
'Données de la section au format JSON. Structure dépend du type de section.';

-- ============================================================
-- FONCTION 1: Nettoyer les anciennes versions (> 15 jours)
-- ============================================================

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

    RAISE NOTICE 'Nettoyé % snapshots de plus de 15 jours', deleted_count;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION principale.cleanup_old_snapshots IS
'Nettoie automatiquement les snapshots de plus de 15 jours (sauf version courante)';

-- ============================================================
-- FONCTION 2: Limiter à 10 versions par utilisateur
-- ============================================================

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

-- ============================================================
-- FONCTION 3: Obtenir le prochain numéro de version
-- ============================================================

CREATE OR REPLACE FUNCTION principale.get_next_version_number(
    p_id_projet VARCHAR(255),
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

    -- Incrémenter (max 10, puis rotation)
    IF max_version >= 10 THEN
        -- Réutiliser le numéro 1 (rotation circulaire)
        RETURN 1;
    ELSE
        RETURN max_version + 1;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION principale.get_next_version_number IS
'Retourne le prochain numéro de version (1-10) pour un projet/utilisateur';

COMMIT;

-- ============================================================
-- VÉRIFICATION
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SYSTÈME DE VERSIONING CRÉÉ AVEC SUCCÈS !';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tables créées:';
    RAISE NOTICE '  ✓ principale.projet_snapshot';
    RAISE NOTICE '  ✓ principale.projet_snapshot_section';
    RAISE NOTICE '';
    RAISE NOTICE 'Fonctions créées:';
    RAISE NOTICE '  ✓ cleanup_old_snapshots()';
    RAISE NOTICE '  ✓ limit_user_snapshots()';
    RAISE NOTICE '  ✓ get_next_version_number()';
    RAISE NOTICE '';
    RAISE NOTICE 'Triggers créés:';
    RAISE NOTICE '  ✓ trigger_limit_snapshots';
    RAISE NOTICE '========================================';
END $$;
