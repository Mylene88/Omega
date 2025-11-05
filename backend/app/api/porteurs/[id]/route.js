//backend/app/api/porteurs/[id]/route.js
import { NextResponse } from 'next/server';
import db from '@/backend/models';  

const { ProjetPorteur, TypePorteurEnum, Projet } = db;  
// GET /api/porteur/[id]
export async function GET(_req, contextPromise) {
  const { params } = await contextPromise; // Attend le contexte
  try {
    const porteur = await ProjetPorteur.findByPk(params.id, {
      include: [{ model: TypePorteurEnum, attributes: ['id_type_porteur', 'libelle'] }],
    });
    if (!porteur) {
      return NextResponse.json({ error: 'Porteur non trouvé' }, { status: 404 });
    }
    return NextResponse.json(porteur, { status: 200 });
  } catch (error) {
    console.error(`Erreur GET /api/porteur/${params.id}:`, error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/porteur/[id]
export async function PUT(_req, contextPromise) {
  const { params } = await contextPromise; // Attend le contexte
  try {
    const data = await _req.json();
    const porteur = await ProjetPorteur.findByPk(params.id);
    if (!porteur) {
      return NextResponse.json({ error: 'Porteur non trouvé' }, { status: 404 });
    }
    if (data.type_porteur_id) {
      const type = await TypePorteurEnum.findByPk(data.type_porteur_id);
      if (!type) {
        return NextResponse.json({ error: 'Type de porteur invalide' }, { status: 400 });
      }
    }
    await porteur.update(data);
    return NextResponse.json(porteur, { status: 200 });
  } catch (error) {
    console.error(`Erreur PUT /api/porteur/${params.id}:`, error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/porteur/[id]
export async function DELETE(_req, contextPromise) {
  const { params } = await contextPromise; // Attend le contexte
  try {
    const porteur = await ProjetPorteur.findByPk(params.id);
    if (!porteur) {
      return NextResponse.json({ error: 'Porteur non trouvé' }, { status: 404 });
    }
    await porteur.destroy();
    return NextResponse.json({ message: 'Porteur supprimé' }, { status: 200 });
  } catch (error) {
    console.error(`Erreur DELETE /api/porteur/${params.id}:`, error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
