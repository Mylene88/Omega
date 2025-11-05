//backend/app/api/suivi/[id]/route.js

import { NextResponse } from 'next/server';
import db from '@/backend/models';  // ✅ Changé

const { ProjetSuivi, User } = db;  // ✅ Changé

// GET /api/suivi/[id]
export async function GET(request, { params }) {  // ✅ Changé
  try {
    const { id } = params;  // ✅ Accès direct
    
    const suivi = await ProjetSuivi.findByPk(id, {
      include: [{ 
        model: User, 
        as: 'auteur',  // ✅ Vérifiez l'alias
        attributes: ['id_user', 'username'] 
      }],
    });

    if (!suivi) {
      return NextResponse.json({ error: 'Suivi non trouvé' }, { status: 404 });
    }

    return NextResponse.json({
      id_suivi: suivi.id_suivi,
      projet_id: suivi.id_projet,
      suivi: suivi.suivi,
      created_at: suivi.created_at,
      created_by: suivi.auteur?.username || null,
    }, { status: 200 });
  } catch (error) {
    console.error(`Erreur GET /api/suivi/${params?.id}:`, error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/suivi/[id]
export async function PUT(request, { params }) {  // ✅ Changé
  try {
    const { id } = params;
    const data = await request.json();
    
    const suivi = await ProjetSuivi.findByPk(id);

    if (!suivi) {
      return NextResponse.json({ error: 'Suivi non trouvé' }, { status: 404 });
    }

    await suivi.update({
      suivi: data.suivi ?? suivi.suivi,
    });

    const user = await User.findByPk(suivi.created_by);

    return NextResponse.json({
      id_suivi: suivi.id_suivi,
      projet_id: suivi.id_projet,
      suivi: suivi.suivi,
      created_at: suivi.created_at,
      created_by: user?.username || null,
    }, { status: 200 });
  } catch (error) {
    console.error(`Erreur PUT /api/suivi/${params?.id}:`, error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/suivi/[id]
export async function DELETE(request, { params }) {  // ✅ Changé
  try {
    const { id } = params;
    
    const suivi = await ProjetSuivi.findByPk(id);

    if (!suivi) {
      return NextResponse.json({ error: 'Suivi non trouvé' }, { status: 404 });
    }

    await suivi.destroy();

    return NextResponse.json({ message: 'Suivi supprimé' }, { status: 200 });
  } catch (error) {
    console.error(`Erreur DELETE /api/suivi/${params?.id}:`, error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
