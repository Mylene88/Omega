// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic';

// backend/app_backup/api/admin/snapshots/export/route.js

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/backend/lib/adminAuthHelper';
import db from '@/backend/models';

/**
 * GET /api/admin/snapshots/export
 * Exporte les snapshots au format CSV
 *
 * Query params:
 * - format: csv (défaut) ou json
 * - limit: nombre max d'entrées (défaut: 1000)
 * - idProjet: filtrer par projet
 * - userId: filtrer par utilisateur
 * - dateFrom: date de début (format ISO)
 * - dateTo: date de fin (format ISO)
 */
export async function GET(request) {
  try {
    // Vérifier l'accès admin
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.allowed) {
      return NextResponse.json(adminCheck.response, { status: adminCheck.status });
    }

    // Extraire les paramètres
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const limit = parseInt(searchParams.get('limit') || '1000');
    const idProjet = searchParams.get('idProjet');
    const filterUserId = searchParams.get('userId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    console.log(`📥 [SNAPSHOT EXPORT] Format: ${format}, Limit: ${limit}`);

    // Construire les filtres
    const where = {};
    if (idProjet) where.id_projet = idProjet;
    if (filterUserId) where.user_id = parseInt(filterUserId);
    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) where.created_at[db.Sequelize.Op.gte] = new Date(dateFrom);
      if (dateTo) where.created_at[db.Sequelize.Op.lte] = new Date(dateTo);
    }

    // Récupérer les snapshots
    const snapshots = await db.ProjetSnapshot.findAll({
      where,
      include: [
        {
          model: db.User,
          as: 'user',
          attributes: ['id_user', 'username', 'prenom', 'nom']
        },
        {
          model: db.Projet,
          as: 'projet',
          attributes: ['id_projet', 'nom_projet']
        },
        {
          model: db.ProjetSnapshotSection,
          as: 'sections',
          attributes: ['section_name', 'section_data']
        }
      ],
      order: [['created_at', 'DESC']],
      limit
    });

    if (format === 'json') {
      // Export JSON
      const jsonData = snapshots.map(snapshot => {
        const snapshotData = {};
        if (snapshot.sections && snapshot.sections.length > 0) {
          snapshot.sections.forEach(section => {
            snapshotData[section.section_name] = section.section_data;
          });
        }

        return {
          id: snapshot.id_snapshot,
          id_projet: snapshot.id_projet,
          projet_nom: snapshot.projet?.nom_projet || 'Projet inconnu',
          version_number: snapshot.version_number,
          is_current: snapshot.is_current,
          snapshot_date: snapshot.snapshot_date,
          description: snapshot.description,
          user_id: snapshot.user_id,
          username: snapshot.user?.username || 'N/A',
          user_name: snapshot.user ? `${snapshot.user.prenom || ''} ${snapshot.user.nom || ''}`.trim() : 'N/A',
          created_at: snapshot.created_at,
          sections: snapshotData
        };
      });

      return NextResponse.json({
        success: true,
        data: jsonData,
        count: jsonData.length,
        exported_at: new Date().toISOString()
      });
    }

    // Export CSV
    const rows = [];

    // En-tête
    rows.push([
      'ID Snapshot',
      'Date/Heure Snapshot',
      'ID Projet',
      'Nom Projet',
      'Version',
      'Version Actuelle',
      'Description',
      'Utilisateur',
      'Nom Complet',
      'Nb Sections',
      'Sections',
      'Date Création'
    ]);

    // Données
    snapshots.forEach(snapshot => {
      const snapshotDate = snapshot.snapshot_date
        ? new Date(snapshot.snapshot_date).toLocaleString('fr-FR')
        : 'N/A';
      const createdDate = snapshot.created_at
        ? new Date(snapshot.created_at).toLocaleString('fr-FR')
        : 'N/A';
      const username = snapshot.user?.username || 'N/A';
      const nomComplet = snapshot.user
        ? `${snapshot.user.prenom || ''} ${snapshot.user.nom || ''}`.trim()
        : 'N/A';
      const projetNom = snapshot.projet?.nom_projet || 'Projet inconnu';
      const nbSections = snapshot.sections?.length || 0;
      const sectionsNames = snapshot.sections?.map(s => s.section_name).join(', ') || 'N/A';

      rows.push([
        snapshot.id_snapshot,
        snapshotDate,
        snapshot.id_projet,
        projetNom,
        snapshot.version_number,
        snapshot.is_current ? 'Oui' : 'Non',
        snapshot.description || '',
        username,
        nomComplet,
        nbSections,
        sectionsNames,
        createdDate
      ]);
    });

    // Convertir en CSV
    const csvContent = rows
      .map(row => row.map(cell => {
        const cellStr = String(cell || '');
        // Échapper les guillemets et entourer de guillemets si nécessaire
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
      .join('\n');

    // Ajouter BOM UTF-8 pour Excel
    const bom = '\uFEFF';
    const csvBuffer = Buffer.from(bom + csvContent, 'utf-8');

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `snapshots_${timestamp}.csv`;

    console.log(`✅ [SNAPSHOT EXPORT] Export réussi: ${snapshots.length} entrées`);

    return new NextResponse(csvBuffer, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('❌ [SNAPSHOT EXPORT]:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur lors de l\'export des snapshots',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

/**
 * OPTIONS pour CORS
 */
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
