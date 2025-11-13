// Endpoint temporaire pour exécuter la migration demande_suppression
import { NextResponse } from 'next/server';
import db from '@/backend/models';

export async function POST(request) {
  try {
    console.log('🚀 Début de la migration demande_suppression...');

    // Vérifier la connexion
    await db.sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie');

    // Exécuter la requête SQL
    const query = `
      ALTER TABLE principale.projet
      ADD COLUMN IF NOT EXISTS demande_suppression BOOLEAN NOT NULL DEFAULT false;
    `;

    await db.sequelize.query(query);
    console.log('✅ Colonne demande_suppression ajoutée avec succès');

    // Vérifier que la colonne existe
    const [results] = await db.sequelize.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'principale'
        AND table_name = 'projet'
        AND column_name = 'demande_suppression';
    `);

    if (results.length > 0) {
      console.log('✅ Vérification réussie:', results[0]);
      return NextResponse.json({
        success: true,
        message: 'Migration exécutée avec succès',
        column: results[0]
      });
    } else {
      console.error('❌ La colonne n\'a pas été trouvée après migration');
      return NextResponse.json({
        success: false,
        message: 'La colonne n\'a pas été trouvée après migration'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de la migration',
      error: error.message
    }, { status: 500 });
  }
}

// CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
