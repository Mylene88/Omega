-- Migration: Créer la fonction get_next_section_version_number
-- Date: 2025-11-19
-- Description: Fonction pour obtenir le prochain numéro de version pour une section spécifique d'un projet par utilisateur (rotation 1-10)

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

-- Ajouter un commentaire
COMMENT ON FUNCTION principale.get_next_section_version_number(TEXT, INTEGER, TEXT) IS
'Retourne le prochain numéro de version (1-10) pour une section spécifique d''un projet par utilisateur. Rotation automatique après la version 10.';
