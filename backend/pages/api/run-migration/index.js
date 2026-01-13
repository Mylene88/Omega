// Force dynamic rendering (no static generation at build time)

// Endpoint pour exécuter la migration de la fonction SQL get_next_section_version_number
import db from '../../../models';



// CORS


export default async function handler(req, res) {
  if (req.method === 'POST') {

  try {
    console.log('🚀 Début de la migration de la fonction SQL...');

    // Vérifier la connexion
    await db.sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie');

    // Créer la fonction get_next_section_version_number
    console.log('📝 Création de la fonction get_next_section_version_number...');
    await db.sequelize.query(`
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
    `);

    console.log('✅ Fonction get_next_section_version_number créée');

    // Ajouter un commentaire
    await db.sequelize.query(`
      COMMENT ON FUNCTION principale.get_next_section_version_number(TEXT, INTEGER, TEXT) IS
      'Retourne le prochain numéro de version (1-10) pour une section spécifique d''un projet par utilisateur. Rotation automatique après la version 10.';
    `);

    console.log('✅ Commentaire ajouté à la fonction');

    // Tester la fonction
    const [testResult] = await db.sequelize.query(`
      SELECT principale.get_next_section_version_number('TEST123', 1, 'porteurs') as next_version
    `);

    console.log('✅ Test de la fonction réussi:', testResult[0]);

    return res.json({
      success: true,
      message: 'Migration exécutée avec succès ! La fonction SQL get_next_section_version_number a été créée.',
      details: {
        function: 'principale.get_next_section_version_number',
        parameters: ['p_id_projet TEXT', 'p_user_id INTEGER', 'p_section_name TEXT'],
        returns: 'INTEGER (1-10)',
        test_result: testResult[0]
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    return res.json({
      success: false,
      message: 'Erreur lors de la migration',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
  }
  else if (req.method === 'OPTIONS') {

  return res.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
  }
  else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}
