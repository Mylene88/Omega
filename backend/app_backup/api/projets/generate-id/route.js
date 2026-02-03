// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic';

// app_backup/api/projets/generate-id/route.js
import { NextResponse } from 'next/server';
import generateUniqueProjectId from '@/backend/utils/identifiant';

export async function GET() {
    try {
        const idprojet = await generateUniqueProjectId(5);
        return NextResponse.json(
            {
                success: true,
                message: 'ID généré avec succès',
                data: {
                    idprojet,
                    generated_at: new Date().toISOString()
                }
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Erreur génération ID:', error);
        return NextResponse.json(
            {
                success: false,
                error: "Erreur lors de la génération de l'ID",
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: 500 }
        );
    }
}