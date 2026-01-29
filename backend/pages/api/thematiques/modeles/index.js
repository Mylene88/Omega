// pages/api/thematiques/modeles.js
const {
  generateModeleOptions,
  thematiqueModeles,
  getAllEnumTables,
  validateModelConfig,
  getModelsByThematique,
  getAllThematiques,
  getModelByValue
} = require('@/backend/lib/config');

export default async function handler(req, res) {
  // ✅ CORS Headers
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3001');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Access-Control-Max-Age', '86400');

  // ✅ OPTIONS - Preflight CORS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // ============================================================
  // ✅ GET - Récupérer les modèles de thématiques
  // ============================================================
  if (req.method === 'GET') {
    try {
      console.log('🚀 GET /api/thematiques/modeles called');

      // ✅ Récupérer les query params (Pages Router)
      const { thematique, includeValidation } = req.query;
      const includeValidationBool = includeValidation === 'true';

      console.log('📋 Parameters:', { thematique, includeValidation: includeValidationBool });

      let responseData = {
        success: true,
        timestamp: new Date().toISOString(),
      };

      if (thematique) {
        const models = getModelsByThematique(thematique);

        if (Object.keys(models).length === 0) {
          return res.status(404).json({
            success: false,
            message: `Thématique '${thematique}' non trouvée`,
            availableThematiques: getAllThematiques()
          });
        }

        responseData = {
          ...responseData,
          data: {
            thematique,
            models: models,
            count: Object.keys(models).length
          }
        };
      } else {
        console.log('🔧 Generating model options...');

        try {
          const modelOptions = generateModeleOptions();
          const thematiques = getAllThematiques();

          console.log('✅ Generated options:', {
            optionsCount: modelOptions.length,
            thematiquesCount: thematiques.length
          });

          if (modelOptions.length > 0) {
            console.log('📋 Sample option:', modelOptions[0]);
          }

          responseData = {
            ...responseData,
            data: {
              modelOptions,
              thematiqueModeles,
              thematiques,
              stats: {
                totalThematiques: thematiques.length,
                totalModeles: modelOptions.length,
                enumTablesCount: getAllEnumTables().size
              }
            }
          };
        } catch (configError) {
          console.error('❌ Error generating config:', configError);
          throw configError;
        }
      }

      if (includeValidationBool) {
        const validationResults = {};

        Object.keys(thematiqueModeles).forEach(themKey => {
          validationResults[themKey] = {};
          Object.keys(thematiqueModeles[themKey]).forEach(modKey => {
            validationResults[themKey][modKey] = validateModelConfig(
              thematiqueModeles[themKey][modKey]
            );
          });
        });

        responseData.validation = validationResults;
      }

      console.log('📦 Final response data keys:', Object.keys(responseData));
      return res.status(200).json(responseData);

    } catch (error) {
      console.error('💥 Error in GET /api/thematiques/modeles:', error);
      console.error('📍 Stack trace:', error.stack);

      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des modèles',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ============================================================
  // ✅ POST - Valider un modèle
  // ============================================================
  if (req.method === 'POST') {
    try {
      // ✅ Parse body (Pages Router)
      let body;
      if (req.headers['content-type']?.includes('application/json')) {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      } else {
        body = req.body || {};
      }

      const { modelValue, config } = body;

      if (modelValue) {
        const modelConfig = getModelByValue(modelValue);

        if (!modelConfig) {
          return res.status(404).json({
            success: false,
            message: 'Configuration du modèle non trouvée',
            modelValue
          });
        }

        const validation = validateModelConfig(modelConfig);

        return res.status(200).json({
          success: true,
          data: {
            modelConfig,
            validation,
            timestamp: new Date().toISOString()
          }
        });

      } else if (config) {
        const validation = validateModelConfig(config);

        return res.status(200).json({
          success: true,
          data: {
            validation,
            timestamp: new Date().toISOString()
          }
        });

      } else {
        return res.status(400).json({
          success: false,
          message: 'modelValue ou config requis'
        });
      }

    } catch (error) {
      console.error('Erreur POST /api/thematiques/modeles:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la validation du modèle',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  // ✅ Méthode non autorisée
  res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
  return res.status(405).json({
    success: false,
    error: `Method ${req.method} Not Allowed`
  });
}