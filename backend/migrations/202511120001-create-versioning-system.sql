-- Migration pour créer le système de versioning
-- Date: 2025-11-12
-- Description: Système de versioning avec 10 versions max par user, retention 15 jours

-- ============================================================
-- Table: projet_snapshot
-- Description: Métadonnées de chaque version sauvegardée
-- ============================================================
CREATE TABLE IF NOT EXISTS principale.projet_snapshot (
    id_snapshot SERIAL PRIMARY KEY,
    id_projet VARCHAR(20) NOT NULL REFERENCES principale.projet(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES principale.user(id_user) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    snapshot_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    -- Indique si c'est la version actuelle (dernière sauvegarde)
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Contrainte: un projet peut avoir max 10 versions par user
    CONSTRAINT unique_project_user_version UNIQUE(id_projet, user_id, version_number)
);

-- ============================================================
-- Table: projet_snapshot_section
-- Description: Données par section pour chaque snapshot
-- ============================================================
CREATE TABLE IF NOT EXISTS principale.projet_snapshot_section (
    id_section SERIAL PRIMARY KEY,
    id_snapshot INTEGER NOT NULL REFERENCES principale.projet_snapshot(id_snapshot) ON DELETE CASCADE,
    section_name VARCHAR(50) NOT NULL,
    -- Les valeurs possibles: 'projet_info', 'porteurs', 'suivis', 'thematiques', 'documents', 'geometrie'
    section_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Contrainte: chaque section unique par snapshot
    CONSTRAINT unique_snapshot_section UNIQUE(id_snapshot, section_name),

    -- Contrainte: valider le nom de section
    CONSTRAINT valid_section_name CHECK (
        section_name IN ('projet_info', 'porteurs', 'suivis', 'thematiques', 'documents', 'geometrie')
    )
);

-- ============================================================
-- Index pour performances
-- ============================================================

-- Index pour rechercher les snapshots par projet
CREATE INDEX idx_snapshot_projet ON principale.projet_snapshot(id_projet);

-- Index pour rechercher les snapshots par utilisateur
CREATE INDEX idx_snapshot_user ON principale.projet_snapshot(user_id);

-- Index pour rechercher par date (pour le nettoyage)
CREATE INDEX idx_snapshot_date ON principale.projet_snapshot(snapshot_date DESC);

-- Index composite pour recherche projet + user
CREATE INDEX idx_snapshot_projet_user ON principale.projet_snapshot(id_projet, user_id, version_number DESC);

-- Index pour rechercher les versions courantes
CREATE INDEX idx_snapshot_current ON principale.projet_snapshot(id_projet, is_current) WHERE is_current = true;

-- Index pour rechercher les sections par snapshot
CREATE INDEX idx_section_snapshot ON principale.projet_snapshot_section(id_snapshot);

-- Index pour rechercher par type de section
CREATE INDEX idx_section_name ON principale.projet_snapshot_section(section_name);

-- Index GIN pour recherche dans les données JSON
CREATE INDEX idx_section_data ON principale.projet_snapshot_section USING GIN(section_data);

-- ============================================================
-- Commentaires pour documentation
-- ============================================================

COMMENT ON TABLE principale.projet_snapshot IS
'Métadonnées des versions sauvegardées. Max 10 versions par utilisateur, rétention 15 jours.';

COMMENT ON COLUMN principale.projet_snapshot.version_number IS
'Numéro de version (1-10). La version 10 est la plus récente.';

COMMENT ON COLUMN principale.projet_snapshot.is_current IS
'Indique si c''est la dernière version sauvegardée (version courante).';

COMMENT ON TABLE principale.projet_snapshot_section IS
'Données par section pour chaque snapshot. Permet la restauration sélective.';

COMMENT ON COLUMN principale.projet_snapshot_section.section_name IS
'Type de section: projet_info, porteurs, suivis, thematiques, documents, geometrie';

COMMENT ON COLUMN principale.projet_snapshot_section.section_data IS
'Données de la section au format JSON. Structure dépend du type de section.';

-- ============================================================
-- Fonction: Nettoyer les anciennes versions (> 15 jours)
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

    -- Log le nettoyage
    RAISE NOTICE 'Nettoyé % snapshots de plus de 15 jours', deleted_count;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION principale.cleanup_old_snapshots IS
'Nettoie automatiquement les snapshots de plus de 15 jours (sauf version courante)';

-- ============================================================
-- Fonction: Limiter à 10 versions par utilisateur
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

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_limit_snapshots ON principale.projet_snapshot;
CREATE TRIGGER trigger_limit_snapshots
    AFTER INSERT ON principale.projet_snapshot
    FOR EACH ROW
    EXECUTE FUNCTION principale.limit_user_snapshots();

COMMENT ON FUNCTION principale.limit_user_snapshots IS
'Trigger: Limite automatiquement à 10 versions par utilisateur par projet';

-- ============================================================
-- Fonction: Obtenir le prochain numéro de version
-- ============================================================

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
