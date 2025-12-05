#!/bin/bash
# Script pour vérifier les snapshots créés

# Charger les variables d'environnement
set -a
source "$(dirname "$0")/../../.env"
set +a

echo "📊 Vérification des snapshots..."
echo ""

PGPASSWORD="$POSTGRES_PWD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USR" -d "$POSTGRES_DB" << 'EOF'
-- Nombre total de snapshots
SELECT COUNT(*) as total_snapshots FROM principale.section_version;

-- Snapshots par projet
SELECT
  sv.id_projet,
  p.nom_projet,
  COUNT(*) as nb_versions
FROM principale.section_version sv
LEFT JOIN principale.projet p ON sv.id_projet = p.id_projet
GROUP BY sv.id_projet, p.nom_projet
ORDER BY nb_versions DESC;

-- Snapshots par section
SELECT
  section_name,
  COUNT(*) as nb_versions
FROM principale.section_version
GROUP BY section_name
ORDER BY nb_versions DESC;

-- Versions anciennes (plus de 30 jours)
SELECT COUNT(*) as anciennes_versions
FROM principale.section_version
WHERE snapshot_date < NOW() - INTERVAL '30 days';

-- Versions en excès (plus de 10 par section/utilisateur/projet)
SELECT
  id_projet,
  user_id,
  section_name,
  COUNT(*) as nb_versions
FROM principale.section_version
GROUP BY id_projet, user_id, section_name
HAVING COUNT(*) > 10;

EOF
