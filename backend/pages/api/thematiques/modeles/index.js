// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic';

// backend/app/api/thematiques/modeles/route.js

import { NextResponse } from 'next/server';

const {
    generateModeleOptions,
    thematiqueModeles,
    getAllEnumTables,
    validateModelConfig,
    getModelsByThematique,
    getAllThematiques,
    getModelByValue
} = require('@/backend/lib/config');


const corsHeaders = {
    'Access-Control-Allow-Origin': 'http://localhost:3001',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: corsHeaders
    });
}

export async function GET(request) {
    try {
        console.log('🚀 GET /api/thematiques/modeles called');

        const { searchParams } = new URL(request.url);
        const thematique = searchParams.get('thematique');
        const includeValidation = searchParams.get('includeValidation') === 'true';

        console.log('📋 Parameters:', { thematique, includeValidation });

        let responseData = {
            success: true,
            timestamp: new Date().toISOString(),
        };

        if (thematique) {
            const models = getModelsByThematique(thematique);

            if(Object.keys(models).length === 0) {
                return NextResponse.json({
                    success: false,
                    message: `Thématique '${thematique}' non trouvée`,
                    availableThematiques: getAllThematiques()
                }, {
                    status: 404,
                    headers: corsHeaders
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

        if (includeValidation) {
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
        return NextResponse.json(responseData, {
            status: 200,
            headers: corsHeaders
        });

    } catch (error) {
        console.error('💥 Error in GET /api/thematiques/modeles:', error);
        console.error('📍 Stack trace:', error.stack);

        return NextResponse.json({
            success: false,
            message: 'Erreur lors de la récupération des modèles',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp: new Date().toISOString(),
        }, {
            status: 500,
            headers: corsHeaders
        });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { modelValue, config } = body;

        if (modelValue) {
            const modelConfig = getModelByValue(modelValue);

            if (!modelConfig) {
                return NextResponse.json({
                    success: false,
                    message: 'Configuration du modèle non trouvée',
                    modelValue
                }, {
                    status: 404,
                    headers: corsHeaders
                });
            }

            const validation = validateModelConfig(modelConfig);

            return NextResponse.json({
                success: true,
                data: {
                    modelConfig,
                    validation,
                    timestamp: new Date().toISOString()
                }
            }, {
                headers: corsHeaders
            });

        } else if (config) {
            const validation = validateModelConfig(config);

            return NextResponse.json({
                success: true,
                data: {
                    validation,
                    timestamp: new Date().toISOString()
                }
            }, {
                headers: corsHeaders
            });
        } else {
            return NextResponse.json({
                success: false,
                message: 'modelValue ou config requis'
            }, {
                status: 400,
                headers: corsHeaders
            });
        }

    } catch (error) {
        console.error('Erreur POST /api/thematiques/modeles:', error);
        return NextResponse.json({
            success: false,
            message: 'Erreur lors de la validation du modèle',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        }, {
            status: 500,
            headers: corsHeaders
        });
    }
}