-- Migration SQL : Ajout des fonctionnalités de sécurité ANSSI
-- Version: 1.0
-- Date: 2025-12-03
-- Description: Ajoute la table security_log et améliore la table user pour la conformité ANSSI/RGS

-- ============================================================================
-- PARTIE 1 : Création de la table security_log
-- ============================================================================

CREATE TABLE IF NOT EXISTS principale.security_log (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,  -- INFO, WARNING, ERROR, CRITICAL
    user_id INTEGER REFERENCES principale.user(id_user) ON DELETE SET NULL,
    username VARCHAR(255),
    ip_address VARCHAR(45),  -- Support IPv4 et IPv6
    user_agent TEXT,
    resource VARCHAR(255),  -- Ressource accédée
    action VARCHAR(50),  -- Action effectuée
    status VARCHAR(20),  -- SUCCESS, FAILURE
    details JSONB,  -- Détails additionnels
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Index pour améliorer les performances des recherches
CREATE INDEX IF NOT EXISTS idx_security_log_event_type ON principale.security_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_log_user_id ON principale.security_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_log_timestamp ON principale.security_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_log_severity ON principale.security_log(severity);
CREATE INDEX IF NOT EXISTS idx_security_log_ip_address ON principale.security_log(ip_address);

-- Commentaires pour documentation
COMMENT ON TABLE principale.security_log IS 'Journal des événements de sécurité - Conformité ANSSI règle 12';
COMMENT ON COLUMN principale.security_log.event_type IS 'Type d''événement de sécurité (LOGIN_SUCCESS, LOGIN_FAILED, etc.)';
COMMENT ON COLUMN principale.security_log.severity IS 'Niveau de sévérité : INFO, WARNING, ERROR, CRITICAL';
COMMENT ON COLUMN principale.security_log.details IS 'Détails additionnels en format JSON';

-- ============================================================================
-- PARTIE 2 : Amélioration de la table user pour politique de mots de passe
-- ============================================================================

-- Ajouter la colonne pour suivre la date de changement de mot de passe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'principale'
        AND table_name = 'user'
        AND column_name = 'password_changed_at'
    ) THEN
        ALTER TABLE principale.user
        ADD COLUMN password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

        -- Mettre à jour les utilisateurs existants
        UPDATE principale.user
        SET password_changed_at = created_at
        WHERE password_changed_at IS NULL;
    END IF;
END $$;

-- Ajouter la colonne pour l'expiration du mot de passe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'principale'
        AND table_name = 'user'
        AND column_name = 'password_expires_at'
    ) THEN
        ALTER TABLE principale.user
        ADD COLUMN password_expires_at TIMESTAMP;

        -- Calculer la date d'expiration pour les utilisateurs existants (180 jours après création)
        UPDATE principale.user
        SET password_expires_at = created_at + INTERVAL '180 days'
        WHERE password_expires_at IS NULL;
    END IF;
END $$;

-- Ajouter une colonne pour l'historique des mots de passe (pour éviter la réutilisation)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'principale'
        AND table_name = 'user'
        AND column_name = 'password_history'
    ) THEN
        ALTER TABLE principale.user
        ADD COLUMN password_history JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Ajouter une colonne pour le compteur de tentatives de connexion échouées
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'principale'
        AND table_name = 'user'
        AND column_name = 'failed_login_attempts'
    ) THEN
        ALTER TABLE principale.user
        ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
    END IF;
END $$;

-- Ajouter une colonne pour la date du dernier login
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'principale'
        AND table_name = 'user'
        AND column_name = 'last_login_at'
    ) THEN
        ALTER TABLE principale.user
        ADD COLUMN last_login_at TIMESTAMP;
    END IF;
END $$;

-- Commentaires sur les nouvelles colonnes
COMMENT ON COLUMN principale.user.password_changed_at IS 'Date du dernier changement de mot de passe';
COMMENT ON COLUMN principale.user.password_expires_at IS 'Date d''expiration du mot de passe (180 jours par défaut)';
COMMENT ON COLUMN principale.user.password_history IS 'Historique des 5 derniers hashes de mots de passe (éviter réutilisation)';
COMMENT ON COLUMN principale.user.failed_login_attempts IS 'Compteur de tentatives de connexion échouées consécutives';
COMMENT ON COLUMN principale.user.last_login_at IS 'Date et heure de la dernière connexion réussie';

-- ============================================================================
-- PARTIE 3 : Fonction trigger pour mettre à jour password_changed_at
-- ============================================================================

CREATE OR REPLACE FUNCTION principale.update_password_changed_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Si le mot de passe a changé
    IF NEW.password_hash IS DISTINCT FROM OLD.password_hash THEN
        NEW.password_changed_at := CURRENT_TIMESTAMP;
        NEW.password_expires_at := CURRENT_TIMESTAMP + INTERVAL '180 days';

        -- Ajouter l'ancien hash à l'historique (garder les 5 derniers)
        IF OLD.password_hash IS NOT NULL THEN
            NEW.password_history := (
                SELECT jsonb_agg(value)
                FROM (
                    SELECT value
                    FROM jsonb_array_elements_text(COALESCE(OLD.password_history, '[]'::jsonb))
                    UNION ALL
                    SELECT OLD.password_hash
                    ORDER BY 1 DESC
                    LIMIT 5
                ) AS history
            );
        END IF;

        -- Reset le compteur d'échecs
        NEW.failed_login_attempts := 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_update_password_changed ON principale.user;
CREATE TRIGGER trigger_update_password_changed
    BEFORE UPDATE ON principale.user
    FOR EACH ROW
    EXECUTE FUNCTION principale.update_password_changed_at();

-- ============================================================================
-- PARTIE 4 : Vue pour les statistiques de sécurité
-- ============================================================================

CREATE OR REPLACE VIEW principale.security_stats AS
SELECT
    -- Statistiques générales
    COUNT(*) FILTER (WHERE event_type = 'LOGIN_SUCCESS') AS total_logins_success,
    COUNT(*) FILTER (WHERE event_type = 'LOGIN_FAILED') AS total_logins_failed,
    COUNT(*) FILTER (WHERE event_type = 'LOGIN_BLOCKED') AS total_logins_blocked,
    COUNT(*) FILTER (WHERE severity = 'CRITICAL') AS total_critical_events,
    COUNT(*) FILTER (WHERE severity = 'ERROR') AS total_error_events,
    COUNT(*) FILTER (WHERE severity = 'WARNING') AS total_warning_events,

    -- Statistiques sur les dernières 24h
    COUNT(*) FILTER (
        WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
        AND event_type = 'LOGIN_FAILED'
    ) AS failed_logins_24h,

    COUNT(*) FILTER (
        WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
        AND severity = 'CRITICAL'
    ) AS critical_events_24h,

    -- Statistiques sur le dernier mois
    COUNT(*) FILTER (
        WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'
    ) AS total_events_30d,

    -- Utilisateur avec le plus d'échecs de connexion
    (
        SELECT username
        FROM principale.security_log
        WHERE event_type = 'LOGIN_FAILED'
        AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
        GROUP BY username
        ORDER BY COUNT(*) DESC
        LIMIT 1
    ) AS top_failed_user_7d,

    -- IP avec le plus d'activité suspecte
    (
        SELECT ip_address
        FROM principale.security_log
        WHERE severity IN ('ERROR', 'CRITICAL')
        AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'
        GROUP BY ip_address
        ORDER BY COUNT(*) DESC
        LIMIT 1
    ) AS top_suspicious_ip_7d

FROM principale.security_log;

COMMENT ON VIEW principale.security_stats IS 'Vue agrégée des statistiques de sécurité pour tableau de bord admin';

-- ============================================================================
-- PARTIE 5 : Politique de rétention des logs (optionnel)
-- ============================================================================

-- Fonction pour nettoyer les vieux logs (à exécuter via cron ou scheduler)
CREATE OR REPLACE FUNCTION principale.cleanup_old_security_logs(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM principale.security_log
    WHERE timestamp < CURRENT_TIMESTAMP - (retention_days || ' days')::INTERVAL
    AND severity NOT IN ('CRITICAL');  -- Toujours garder les événements critiques

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Logger le nettoyage
    INSERT INTO principale.security_log (event_type, severity, username, details)
    VALUES (
        'SYSTEM_CLEANUP',
        'INFO',
        'system',
        jsonb_build_object(
            'deleted_logs', deleted_count,
            'retention_days', retention_days
        )
    );

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION principale.cleanup_old_security_logs IS 'Nettoie les logs de sécurité plus anciens que X jours (défaut 365)';

-- ============================================================================
-- PARTIE 6 : Permissions et grants
-- ============================================================================

-- Accorder les permissions nécessaires à l'utilisateur de l'application
-- Note: Adapter le nom d'utilisateur selon votre configuration
DO $$
BEGIN
    -- Si vous avez un utilisateur spécifique pour l'application, décommenter et adapter:
    -- GRANT SELECT, INSERT ON principale.security_log TO omega_app_user;
    -- GRANT USAGE, SELECT ON SEQUENCE principale.security_log_id_seq TO omega_app_user;
    -- GRANT SELECT ON principale.security_stats TO omega_app_user;
    NULL;  -- Placeholder pour la syntaxe DO $$
END $$;

-- ============================================================================
-- PARTIE 7 : Vérification de la migration
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration de sécurité terminée avec succès';
    RAISE NOTICE '📊 Table security_log créée avec % index', (
        SELECT COUNT(*)
        FROM pg_indexes
        WHERE schemaname = 'principale'
        AND tablename = 'security_log'
    );
    RAISE NOTICE '👤 Table user enrichie avec % nouvelles colonnes', (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_schema = 'principale'
        AND table_name = 'user'
        AND column_name IN ('password_changed_at', 'password_expires_at', 'password_history', 'failed_login_attempts', 'last_login_at')
    );
END $$;
