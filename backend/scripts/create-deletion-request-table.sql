-- Création de la table projet_deletion_request
-- Date: 2025-11-07

-- Créer le type ENUM pour le statut
CREATE TYPE principale.deletion_request_statut AS ENUM ('en attente', 'accepter', 'refuser');

-- Créer la table
CREATE TABLE principale.projet_deletion_request (
    id_deletion_request SERIAL PRIMARY KEY,
    id_projet VARCHAR NOT NULL REFERENCES principale.projet(id_projet) ON DELETE CASCADE,
    requested_by INTEGER NOT NULL REFERENCES principale."user"(id_user),
    raison TEXT NOT NULL,
    statut principale.deletion_request_statut NOT NULL DEFAULT 'en attente',
    reviewed_by INTEGER REFERENCES principale."user"(id_user),
    review_comment TEXT,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Créer les index pour améliorer les performances
CREATE INDEX idx_deletion_request_projet ON principale.projet_deletion_request(id_projet);
CREATE INDEX idx_deletion_request_statut ON principale.projet_deletion_request(statut);
CREATE INDEX idx_deletion_request_user ON principale.projet_deletion_request(requested_by);

-- Vérifier que la table a bien été créée
SELECT
    table_schema,
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'principale'
  AND table_name = 'projet_deletion_request'
ORDER BY ordinal_position;

-- Afficher un message de succès
SELECT '✅ Table projet_deletion_request créée avec succès !' AS message;
