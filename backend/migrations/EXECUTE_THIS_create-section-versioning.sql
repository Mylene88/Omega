-- ============================================================
-- Migration complète pour le système de versioning par section
-- À exécuter avec: psql -U postgres -d omega -f EXECUTE_THIS_create-section-versioning.sql
-- ============================================================

\echo '🚀 Début de la migration du système de versioning par section...'

-- ============================================================
-- 1. Créer la table section_version
-- ============================================================

\echo '📋 Création de la table principale.section_version...'

CREATE TABLE IF NOT EXISTS principale.section_version (
    id_version SERIAL PRIMARY KEY,
    id_projet VARCHAR(255) NOT NULL REFERENCES principale.projet(id_projet) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES principale.user(id_user) ON DELETE CASCADE,
    section_name VARCHAR(50) NOT NULL CHECK (
        section_name IN ('projet_info', 'porteurs', 'suivis', 'thematiques', 'documents', 'geometrie')
    ),
    version_number INTEGER NOT NULL CHECK (version_number >= 1 AND version_number <= 10),
    section_data JSONB NOT NULL,
    snapshot_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_current BOOLEAN DEFAULT false,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Index unique pour garantir qu'on n'a qu'une seule version N par section par utilisateur par projet
    CONSTRAINT idx_section_version_unique UNIQUE (id_projet, user_id, section_name, version_number)
);

\echo '  ✅ Table section_version créée'

-- ============================================================
-- 2. Créer les index pour optimiser les requêtes
-- ============================================================

\echo '📊 Création des index...'

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_section_version_projet_section_user
    ON principale.section_version(id_projet, section_name, user_id);

CREATE INDEX IF NOT EXISTS idx_section_version_user_section
    ON principale.section_version(user_id, section_name);

CREATE INDEX IF NOT EXISTS idx_section_version_date
    ON principale.section_version(snapshot_date);

\echo '  ✅ Index créés'

-- ============================================================
-- 3. Ajouter les commentaires
-- ============================================================

COMMENT ON TABLE principale.section_version IS
'Versions des sections de projets avec limite de 10 versions par section par utilisateur';

COMMENT ON COLUMN principale.section_version.id_projet IS 'ID du projet concerné';
COMMENT ON COLUMN principale.section_version.user_id IS 'Utilisateur ayant créé cette version';
COMMENT ON COLUMN principale.section_version.section_name IS 'Nom de la section sauvegardée';
COMMENT ON COLUMN principale.section_version.version_number IS 'Numéro de version (1-10, rotation circulaire)';
COMMENT ON COLUMN principale.section_version.section_data IS 'Données complètes de la section';
COMMENT ON COLUMN principale.section_version.snapshot_date IS 'Date de création de la version';
COMMENT ON COLUMN principale.section_version.is_current IS 'Indique si c''est la version actuelle';
COMMENT ON COLUMN principale.section_version.description IS 'Description optionnelle de la version';
COMMENT ON COLUMN principale.section_version.metadata IS 'Métadonnées additionnelles (changements, contexte, etc.)';

\echo '  ✅ Commentaires ajoutés'

-- ============================================================
-- 4. Créer la fonction get_next_section_version_number
-- ============================================================

\echo '🔧 Création de la fonction get_next_section_version_number...'

CREATE OR REPLACE FUNCTION principale.get_next_section_version_number(
    p_id_projet TEXT,
    p_user_id INTEGER,
    p_section_name TEXT
) RETURNS INTEGER AS $$
DECLARE
    v_max_version INTEGER;
    v_next_version INTEGER;
BEGIN
    -- Récupérer la version maximale actuelle pour cette section, ce projet et cet utilisateur
    SELECT COALESCE(MAX(version_number), 0)
    INTO v_max_version
    FROM principale.section_version
    WHERE id_projet = p_id_projet
        AND user_id = p_user_id
        AND section_name = p_section_name;

    -- Calculer la prochaine version (rotation de 1 à 10)
    IF v_max_version >= 10 THEN
        v_next_version := 1;
    ELSE
        v_next_version := v_max_version + 1;
    END IF;

    RETURN v_next_version;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION principale.get_next_section_version_number(TEXT, INTEGER, TEXT) IS
'Retourne le prochain numéro de version (1-10) pour une section spécifique d''un projet par utilisateur. Rotation automatique après la version 10.';

\echo '  ✅ Fonction get_next_section_version_number créée'

-- ============================================================
-- 5. Vérification finale
-- ============================================================

\echo ''
\echo '🔍 Vérification de l''installation...'

-- Compter les enregistrements existants
SELECT COUNT(*) as nb_versions FROM principale.section_version;

\echo ''
\echo '✅ Migration terminée avec succès !'
\echo ''
\echo '📝 Prochaines étapes :'
\echo '   1. Redémarrer le backend (Ctrl+C puis npm run dev)'
\echo '   2. Tester en modifiant un projet dans l''interface'
\echo '   3. Vérifier dans Admin > Versions de Sections'
\echo ''