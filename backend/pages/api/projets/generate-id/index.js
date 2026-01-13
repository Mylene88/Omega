// Force dynamic rendering (no static generation at build time)

// app/api/projets/generate-id/route.js
import generateUniqueProjectId from '../../../../utils/identifiant';


export default async function handler(req, res) {
  if (req.method === 'GET') {

    try {
        const idprojet = await generateUniqueProjectId(5);
        return res.json(
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
        return res.json(
            {
                success: false,
                error: "Erreur lors de la génération de l'ID",
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: 500 }
        );
    }
  }
  else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}
