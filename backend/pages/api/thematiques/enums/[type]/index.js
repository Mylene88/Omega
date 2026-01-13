// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic';

// backend/app/api/thematiques/enums/[type]/route.js

import { NextResponse } from 'next/server';
import db from '@/backend/models';

const enumMapping = {
    'role_enum': db.RoleEnum,
    'statut_projet_enum': db.StatutProjetEnum,
    'ddt_service_enum': db.DdtServiceEnum,
    'type_porteur_enum': db.TypePorteurEnum,
    'procedure_enum': db.ProcedureEnum,
    'decision_autorisation_enum': db.DecisionAutorisationEnum,
    'document_urbanisme_enum': db.DocumentUrbanismeEnum,
    'procedure_compatibilite_enum': db.ProcedureCompatibiliteEnum,
    'avancement_procedure_enum': db.AvancementProcedureEnum,
    'conformite_sdagdv_enum': db.ConformiteSdagdvEnum,
    'necessite_dep_enum': db.NecessiteDepEnum,
    'necessite_defrichement_enum': db.NecessiteDefrichementEnum,
    'regime_eau_enum': db.RegimeEauEnum,
    'regime_evaluation_env_enum': db.RegimeEvaluationEnvEnum,
    'statut_eau_enum': db.StatutEauEnum,
    'doc_cadre_enum': db.DocCadreEnum,
    'etat_avancement_enum': db.EtatAvancementEnum,
    'instructeur_icpe_enum': db.InstructeurIcpeEnum,
    'origine_intrants_enum': db.OrigineIntrantsEnum,
    'projet_zone_acc_enum': db.ProjetZoneAccEnum,
    'regime_icpe_enum': db.RegimeIcpeEnum,
    'type_installation_enum': db.TypeInstallationEnum,
    'type_methaniseur_enum': db.TypeMethaniseurEnum,
    'type_sol_enum': db.TypeSolEnum,
    'soumis_enum': db.SoumisEnum,
    'avis_cdpenaf_enum': db.AvisCdpenafEnum,
    'avis_prefet_enum': db.AvisPrefetEnum,
    'type_participation_enum': db.TypeParticipationEnum,
    'organisateur_participation_enum': db.OrganisateurParticipationEnum,
    'avis_commissaire_enqueteur_enum': db.AvisCommissaireEnqueteurEnum
};

const corsHeaders = {
    'Access-Control-Allow-Origin': 'http://localhost:3001',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: corsHeaders
    });
}

export async function GET(request, { params }) {
    try {
        const { type } = await params;
        console.log(`🔥 GET enum request for: ${type}`);

        const model = enumMapping[type];

        if (!model) {
            console.error(`❌ Type "${type}" not found`);
            return NextResponse.json({
                success: false,
                message: `Type d'énumération "${type}" non trouvé`,
                availableTypes: Object.keys(enumMapping)
            }, {
                status: 404,
                headers: corsHeaders
            });
        }

        // ✅ Gérer les deux cas : 'value' ET 'libelle'
        const hasLibelle = type === 'type_sol_enum';
        const valueField = hasLibelle ? 'libelle' : 'value';

        const values = await model.findAll({
            attributes: ['id', valueField],
            order: [[valueField, 'ASC']],
            raw: true
        });

        // ✅ Normaliser la réponse pour uniformiser
        const normalizedValues = values.map(v => ({
            id: v.id,
            value: v.value || v.libelle,
            libelle: v.libelle || v.value
        }));

        console.log(`✅ Retrieved ${normalizedValues.length} values for ${type}`);

        return NextResponse.json({
            success: true,
            data: normalizedValues,
            count: normalizedValues.length
        }, {
            status: 200,
            headers: corsHeaders
        });

    } catch (error) {
        console.error(`💥 Error in GET /api/thematiques/enums/[type]:`, error);

        return NextResponse.json({
            success: false,
            message: 'Erreur interne du serveur',
            error: process.env.NODE_ENV === 'development' ? {
                message: error.message,
                stack: error.stack
            } : undefined
        }, {
            status: 500,
            headers: corsHeaders
        });
    }
}