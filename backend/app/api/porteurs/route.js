// app/api/porteur/route.js

import { NextResponse } from 'next/server';
import db from '@/backend/models';  // ✅ Changé

const { ProjetPorteur, TypePorteurEnum, Projet } = db;  // ✅ Changé

export async function GET(request) {  // ✅ Enlevé contextPromise
  try {
    const porteurs = await ProjetPorteur.findAll({
      include: [{ 
        model: TypePorteurEnum, 
        attributes: ['id_type_porteur', 'libelle'] 
      }],
    });

    return NextResponse.json(porteurs, { status: 200 });
  } catch (error) {
    console.error('Erreur GET /api/porteur:', error);
    return NextResponse.json({ 
      error: 'Impossible de récupérer les porteurs' 
    }, { status: 500 });
  }
}

export async function POST(request) {  // ✅ Enlevé contextPromise
  try {
    const data = await request.json();
    
    const projet = await Projet.findByPk(data.id_projet);
    if (!projet) {
      return NextResponse.json({ error: 'Projet non trouvé' }, { status: 404 });
    }

    const type = await TypePorteurEnum.findByPk(data.type_porteur_id);
    if (!type) {
      return NextResponse.json({ error: 'Type porteur invalide' }, { status: 400 });
    }

    const porteur = await ProjetPorteur.create({
      id_projet: data.id_projet,
      type_porteur_id: data.type_porteur_id,
      nom_structure: data.nom_structure,
      autre_type_porteur: data.autre_type_porteur || null,
      referent_nom: data.referent_nom || null,
      referent_fonction: data.referent_fonction || null,
      referent_email: data.referent_email || null,
      referent_tel: data.referent_tel || null,
    });

    console.log('le porteur de ce projet est :', porteur);

    const porteurWithType = await ProjetPorteur.findByPk(porteur.id_porteur, {
      include: [{ model: TypePorteurEnum, attributes: ['libelle'] }],
    });

    return NextResponse.json(porteurWithType, { status: 201 });
  } catch (error) {
    console.error('Erreur POST /api/projet-porteur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
