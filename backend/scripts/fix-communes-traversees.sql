-- Script SQL pour corriger les communes_traversees vides
-- Identifie et corrige les géométries avec codes_insee mais sans communes_traversees

-- ========================================
-- ÉTAPE 1 : Identifier les incohérences
-- ========================================

SELECT
    pg.id_geom,
    pg.id_projet,
    pg.geom_type,
    pg.codes_insee,
    pg.communes_traversees,
    pg.epci,
    pg.arrondissements,
    CASE
        WHEN pg.codes_insee IS NOT NULL AND array_length(pg.codes_insee, 1) > 0
             AND (pg.communes_traversees IS NULL OR array_length(pg.communes_traversees, 1) = 0)
        THEN 'INCOHÉRENCE ❌'
        ELSE 'OK ✅'
    END as statut
FROM principale.projet_geometry pg
WHERE pg.codes_insee IS NOT NULL
  AND array_length(pg.codes_insee, 1) > 0
ORDER BY
    CASE
        WHEN pg.communes_traversees IS NULL OR array_length(pg.communes_traversees, 1) = 0
        THEN 0
        ELSE 1
    END,
    pg.id_geom;

-- ========================================
-- ÉTAPE 2 : Corriger les incohérences
-- ========================================

-- Cette requête met à jour communes_traversees en récupérant les noms
-- depuis geom_commune via les codes_insee

UPDATE principale.projet_geometry pg
SET communes_traversees = (
    SELECT array_agg(DISTINCT gc.nom ORDER BY gc.nom)
    FROM unnest(pg.codes_insee) AS code_insee
    LEFT JOIN principale.geom_commune gc ON gc.code_insee = code_insee
    WHERE gc.nom IS NOT NULL
)
WHERE pg.codes_insee IS NOT NULL
  AND array_length(pg.codes_insee, 1) > 0
  AND (pg.communes_traversees IS NULL OR array_length(pg.communes_traversees, 1) = 0);

-- ========================================
-- ÉTAPE 3 : Vérifier les corrections
-- ========================================

SELECT
    'Corrections effectuées' as message,
    COUNT(*) as nombre_geometries_corrigees
FROM principale.projet_geometry pg
WHERE pg.codes_insee IS NOT NULL
  AND array_length(pg.codes_insee, 1) > 0
  AND pg.communes_traversees IS NOT NULL
  AND array_length(pg.communes_traversees, 1) > 0;

-- ========================================
-- ÉTAPE 4 : Afficher le résumé final
-- ========================================

SELECT
    'Géométries avec codes_insee' as categorie,
    COUNT(*) as total,
    SUM(CASE WHEN pg.communes_traversees IS NOT NULL AND array_length(pg.communes_traversees, 1) > 0 THEN 1 ELSE 0 END) as avec_communes,
    SUM(CASE WHEN pg.communes_traversees IS NULL OR array_length(pg.communes_traversees, 1) = 0 THEN 1 ELSE 0 END) as sans_communes
FROM principale.projet_geometry pg
WHERE pg.codes_insee IS NOT NULL
  AND array_length(pg.codes_insee, 1) > 0;

-- ========================================
-- OPTIONNEL : Voir les détails après correction
-- ========================================

SELECT
    pg.id_geom,
    pg.id_projet,
    p.nom_projet,
    pg.geom_type,
    pg.codes_insee,
    pg.communes_traversees,
    array_length(pg.codes_insee, 1) as nb_codes_insee,
    array_length(pg.communes_traversees, 1) as nb_communes
FROM principale.projet_geometry pg
LEFT JOIN principale.projet p ON p.id_projet = pg.id_projet
WHERE pg.codes_insee IS NOT NULL
  AND array_length(pg.codes_insee, 1) > 0
ORDER BY pg.id_geom;
