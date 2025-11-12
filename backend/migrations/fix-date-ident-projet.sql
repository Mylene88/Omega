-- Migration: Permettre NULL sur la colonne date_ident_projet
-- Date: 2025-11-07

-- Modifier la contrainte NOT NULL
ALTER TABLE principale.projet
ALTER COLUMN date_ident_projet DROP NOT NULL;

-- Vérification
SELECT
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_schema = 'principale'
  AND table_name = 'projet'
  AND column_name = 'date_ident_projet';
