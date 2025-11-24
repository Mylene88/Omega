// backend/app/api/projets/[id]/export/route.js
import { NextResponse } from 'next/server';
import db from '@/backend/models';
import puppeteer from 'puppeteer';

const {
  Projet,
  StatutProjetEnum,
  DdtServiceEnum,
  ProjetPorteur,
  ProjetSuivi,
  ProjetGeometry,
  ProjetInThematique,
  Thematique,
  Document,
  User,
  TypePorteurEnum
} = db;

const { getModelByValue } = require('@/backend/lib/config');

function getSequelizeModelName(tableName) {
  const modelKeys = Object.keys(db).filter(
    k => !['sequelize', 'Sequelize', 'DataTypes'].includes(k)
  );

  for (const modelKey of modelKeys) {
    const model = db[modelKey];
    if (model && model.tableName === tableName) {
      return modelKey;
    }
  }

  return tableName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'pdf';

    console.log(`📥 [EXPORT] Projet: ${id}, Format: ${format}`);

    const projet = await Projet.findByPk(id, {
      include: [
        {
          model: StatutProjetEnum,
          as: 'statut_projet_enum',
          attributes: ['id_statut', 'libelle']
        },
        {
          model: DdtServiceEnum,
          as: 'ddt_service_enum',
          attributes: ['id_service', 'libelle_service']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id_user', 'username', 'prenom', 'nom'],
          required: false
        }
      ]
    });

    if (!projet) {
      return NextResponse.json(
        { success: false, message: 'Projet non trouvé' },
        { status: 404 }
      );
    }

    const [porteurs, suivis, thematiqueAssociations, documents, geometries] =
      await Promise.all([
        ProjetPorteur.findAll({
          where: { id_projet: id },
          include: [
            {
              model: TypePorteurEnum,
              as: 'type_porteur_enum',
              attributes: ['id_type_porteur', 'libelle'],
              required: false
            }
          ]
        }),
        ProjetSuivi.findAll({
          where: { id_projet: id },
          include: [
            {
              model: User,
              as: 'auteur',
              attributes: ['prenom', 'nom'],
              required: false
            }
          ],
          order: [['created_at', 'DESC']]
        }),
        ProjetInThematique.findAll({
          where: { id_projet: id },
          include: [
            {
              model: Thematique,
              as: 'thematique',
              attributes: ['id_thematique', 'libelle', 'modele']
            }
          ]
        }),
        Document.findAll({ where: { id_projet: id } }),
        ProjetGeometry.findAll({ where: { id_projet: id } })
      ]);

    const thematiquesAvecDonnees = [];

    for (const assoc of thematiqueAssociations) {
      const modeles = JSON.parse(assoc.thematique.modele);
      const thematiqueLibelle = assoc.thematique.libelle;

      for (const modeleValue of modeles) {
        try {
          let thematiqueNormalized = thematiqueLibelle;
          const thematiquesCaseSensitive = {
            'enr': 'EnR',
            'Enr': 'EnR',
            'ENR': 'EnR'
          };

          if (thematiquesCaseSensitive[thematiqueLibelle]) {
            thematiqueNormalized = thematiquesCaseSensitive[thematiqueLibelle];
          }

          // 🔥 AJOUT : Alias pour les modèles qui ont des noms différents dans la config
          const modeleAliases = {
            'pv': 'pv_agri_pv',
            'agripv': 'pv_agri_pv',
            'agri-pv': 'pv_agri_pv',
            'agri_pv': 'pv_agri_pv',
            'pvagripv': 'pv_agri_pv',
            'pv et agri-pv': 'pv_agri_pv',
            'pv et agri pv': 'pv_agri_pv',
            'pvetagri-pv': 'pv_agri_pv',
            'pvetagripv': 'pv_agri_pv'
          };

          let modeleNormalized = modeleValue.toLowerCase();
          if (modeleAliases[modeleNormalized]) {
            modeleNormalized = modeleAliases[modeleNormalized];
            console.log(`🔄 [EXPORT] Alias appliqué: "${modeleValue}" → "${modeleNormalized}"`);
          }

          const fullModeleKey = `${thematiqueNormalized}-${modeleNormalized}`;
          console.log(`🔍 [EXPORT] Recherche thématique: "${fullModeleKey}" (libelle: "${thematiqueLibelle}", modele original: "${modeleValue}")`);
          const modeleConfig = getModelByValue(fullModeleKey);

          if (!modeleConfig) {
            console.warn(`⚠️  [EXPORT] Configuration non trouvée pour: "${fullModeleKey}"`);
            continue;
          }
          console.log(`✅ [EXPORT] Configuration trouvée pour: "${fullModeleKey}"`);


          const modelName = getSequelizeModelName(modeleConfig.tableName);
          const Model = db[modelName];

          if (!Model) continue;

          const includeAssociations = [];
          if (modeleConfig.fields) {
            modeleConfig.fields.forEach((field) => {
              if (field.enumTable) {
                const EnumModel = Object.values(db).find(
                  model => model.tableName === field.enumTable
                );

                if (EnumModel) {
                  // 🔍 Détecter dynamiquement les colonnes disponibles dans l'enum table
                  const modelAttributes = Object.keys(EnumModel.rawAttributes || {});
                  console.log(`🔍 [EXPORT] Colonnes disponibles pour ${field.enumTable}:`, modelAttributes);

                  // Chercher la colonne d'affichage (priorité: value > libelle > label > nom)
                  const displayColumn = modelAttributes.find(attr =>
                    ['value', 'libelle', 'label', 'nom', 'type'].includes(attr.toLowerCase())
                  );

                  // Construire les attributs dynamiquement
                  const enumAttributes = ['id'];
                  if (displayColumn) {
                    enumAttributes.push(displayColumn);
                    console.log(`✅ [EXPORT] Colonne d'affichage détectée pour ${field.enumTable}: ${displayColumn}`);
                  } else {
                    console.warn(`⚠️  [EXPORT] Aucune colonne d'affichage trouvée pour ${field.enumTable}, utilisation de toutes les colonnes`);
                  }

                  // 🔍 Pour les relations many-to-many (belongsToMany), Sequelize utilise directement l'alias de l'enum
                  includeAssociations.push({
                    model: EnumModel,
                    as: field.enumTable,
                    attributes: displayColumn ? enumAttributes : undefined,
                    required: false,
                    through: field.relationTable ? { attributes: [] } : undefined // Masquer les colonnes de la table de jointure
                  });

                  if (field.relationTable) {
                    console.log(`✅ [EXPORT] Association many-to-many (belongsToMany) ajoutée: ${field.enumTable} via ${field.relationTable}`);
                  }
                }
              }
            });
          }

          const donnees = await Model.findAll({
            where: {
              id_project: id,
              id_thematique: assoc.thematique.id_thematique
            },
            include: includeAssociations
          });

          if (donnees.length > 0) {
            const donneesFormatees = donnees.map((d) => {
              const formatted = {};

              if (modeleConfig.fields) {
                modeleConfig.fields.forEach((field) => {
                  const displayLabel = field.label || field.name;

                  // 🔍 Gérer les champs avec enumTable
                  if (field.enumTable && d[field.enumTable]) {
                    const enumData = d[field.enumTable];

                    // 🔍 Cas 1: Array (belongsToMany) - choix multiples
                    if (Array.isArray(enumData)) {
                      console.log(`🔍 [EXPORT] Traitement champ multiple: ${field.name}, valeurs:`, enumData.length);

                      const values = enumData
                        .map(enumObj => {
                          const enumKeys = Object.keys(enumObj).filter(k => k !== 'id' && !k.startsWith('_'));
                          const displayKey = ['value', 'libelle', 'label', 'nom', 'type'].find(k => enumObj[k] !== undefined) || enumKeys[0];
                          return displayKey ? enumObj[displayKey] : null;
                        })
                        .filter(v => v !== null);

                      formatted[displayLabel] = values.length > 0 ? values.join(', ') : 'Non renseigné';
                      console.log(`✅ [EXPORT] ${displayLabel}: ${formatted[displayLabel]}`);
                      return; // Skip le reste pour ce champ
                    }
                    // 🔍 Cas 2: Objet unique (belongsTo) - choix simple
                    else if (typeof enumData === 'object') {
                      const enumKeys = Object.keys(enumData).filter(k => k !== 'id' && !k.startsWith('_'));
                      const displayKey = ['value', 'libelle', 'label', 'nom', 'type'].find(k => enumData[k] !== undefined) || enumKeys[0];
                      formatted[displayLabel] = displayKey ? enumData[displayKey] : 'Non renseigné';
                      console.log(`🔍 [EXPORT] Enum ${field.enumTable} - clé utilisée: ${displayKey}, valeur: ${formatted[displayLabel]}`);
                      return; // Skip le reste pour ce champ
                    }
                  }

                  // 🔍 Traitement des champs non-enum
                  const value = d[field.name];

                  if (value === null || value === undefined || value === '') {
                    formatted[displayLabel] = 'Non renseigné';
                  } else {
                    let displayValue = value;

                    if (typeof value === 'boolean') {
                      displayValue = value ? 'Oui' : 'Non';
                    } else if (Array.isArray(value)) {
                      displayValue = value.length > 0 ? value.join(', ') : 'Non renseigné';
                    } else if (field.type === 'date' && value) {
                      displayValue = new Date(value).toLocaleDateString('fr-FR');
                    }

                    formatted[displayLabel] = displayValue;
                  }
                });
              }

              return formatted;
            });

            thematiquesAvecDonnees.push({
              libelle: thematiqueLibelle,
              modeleDisplayName: modeleConfig.displayName || modeleValue,
              fields: modeleConfig.fields || [],
              data: donneesFormatees
            });
          }
        } catch (error) {
          console.error(`❌ Erreur: ${error.message}`);
        }
      }
    }

    const projetData = {
      id_projet: projet.id_projet,
      nom_projet: projet.nom_projet,
      description: projet.description,
      statut_projet_enum: projet.statut_projet_enum,
      ddt_service_enum: projet.ddt_service_enum,
      creator: projet.creator,
      created_at: projet.created_at,
      updated_at: projet.updated_at,
      porteurs: porteurs.map((p) => p.toJSON()),
      suivis: suivis.map((s) => s.toJSON()),
      thematiques: thematiquesAvecDonnees,
      documents: documents.map((d) => d.toJSON()),
      geometry: geometries.map((g) => g.toJSON())
    };

    switch (format.toLowerCase()) {
      case 'pdf':
        return await generatePDF(projetData);

      case 'csv':
        return await generateCSV(projetData);

      case 'geojson':
        return await generateGeoJSON(projetData);

      default:
        return NextResponse.json(
            { success: false, message: `Format non supporté: ${format}. Formats disponibles: pdf, csv, geojson` },
            { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ [EXPORT]:', error);
    return NextResponse.json(
      { success: false, message: 'Erreur export', error: error.message },
      { status: 500 }
    );
  }
}

async function generateGeoJSON(projet) {
  const features = [];

  // Convertir les géométries
  if (projet.geometry && projet.geometry.length > 0) {
    projet.geometry.forEach((geom) => {
      if (geom.geom) {
        features.push({
          type: 'Feature',
          properties: {
            id_projet: projet.id_projet,
            nom_projet: projet.nom_projet,
            statut: projet.statut_projet_enum?.libelle,
            geom_type: geom.geom_type,
            area_m2: geom.area_m2,
            length_m: geom.length_m,
            communes: geom.communes_traversees,
            codes_insee: geom.codes_insee,
            epci: geom.epci,
            arrondissements: geom.arrondissements,
            maires: geom.maires,
            deputes: geom.deputes
          },
          geometry: geom.geom
        });
      }
    });
  }

  const geoJSON = {
    type: 'FeatureCollection',
    features: features,
    properties: {
      projet: {
        id: projet.id_projet,
        nom: projet.nom_projet,
        description: projet.description,
        statut: projet.statut_projet_enum?.libelle
      }
    }
  };

  const jsonBuffer = Buffer.from(JSON.stringify(geoJSON, null, 2), 'utf-8');

  return new NextResponse(jsonBuffer, {
    headers: {
      'Content-Type': 'application/geo+json',
      'Content-Disposition': `attachment; filename="projet_${projet.id_projet}.geojson"`,
      'Cache-Control': 'no-cache'
    }
  });
}


async function generateCSV(projet) {
  const rows = [];

  // En-tête
  rows.push([
    'ID Projet',
    'Nom',
    'Description',
    'Statut',
    'Service DDT',
    'Nb Porteurs',
    'Nb Suivis',
    'Nb Thématiques',
    'Nb Documents',
    'Date Création',
    'Date Modification'
  ]);

  // Données du projet
  rows.push([
    projet.id_projet,
    projet.nom_projet || '',
    projet.description || '',
    projet.statut_projet_enum?.libelle || '',
    projet.ddt_service_enum?.libelle_service || '',
    projet.porteurs?.length || 0,
    projet.suivis?.length || 0,
    projet.thematiques?.length || 0,
    projet.documents?.length || 0,
    projet.created_at ? new Date(projet.created_at).toLocaleDateString('fr-FR') : '',
    projet.updated_at ? new Date(projet.updated_at).toLocaleDateString('fr-FR') : ''
  ]);

  // Convertir en CSV
  const csvContent = rows
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

  // Ajouter BOM UTF-8 pour Excel
  const bom = '\uFEFF';
  const csvBuffer = Buffer.from(bom + csvContent, 'utf-8');

  return new NextResponse(csvBuffer, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="projet_${projet.id_projet}.csv"`,
      'Cache-Control': 'no-cache'
    }
  });
}


async function generatePDF(projet) {
  const html = generateHTML(projet);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '8mm',
        right: '10mm',
        bottom: '8mm',
        left: '10mm'
      },
      printBackground: true,
      preferCSSPageSize: true
    });

    await browser.close();

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="projet_${projet.id_projet}.pdf"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    await browser.close();
    throw error;
  }
}

function generateHTML(projet) {
  // INFORMATIONS GÉNÉRALES
  let infoHTML = '<div class="section"><h2 class="section-title">Informations Générales</h2>';
  infoHTML += `
    <div class="info-block">
      <table class="data-table">
        <tr>
          <td class="field-label">Description</td>
          <td class="field-value">${projet.description || 'Non renseigné'}</td>
        </tr>
        <tr>
          <td class="field-label">Statut du projet</td>
          <td class="field-value">${projet.statut_projet_enum?.libelle || 'Non renseigné'}</td>
        </tr>
        <tr>
          <td class="field-label">Date prise de connaissance par la DDT</td>
          <td class="field-value">${projet.created_at ? new Date(projet.created_at).toLocaleDateString('fr-FR') : 'Non renseignée'}</td>
        </tr>
      </table>
    </div>
  </div>`;

  // PORTEURS
  let porteursHTML = '';
  if (projet.porteurs && projet.porteurs.length > 0) {
    porteursHTML = '<div class="section"><h2 class="section-title">Porteurs de Projet</h2>';

    projet.porteurs.forEach((porteur, idx) => {
      porteursHTML += `
        <div class="porteur-block">
          <div class="block-header">
            <span class="block-number">${idx + 1}</span>
            <h3 class="block-title">Porteur ${idx + 1}</h3>
            ${porteur.type_porteur_enum?.libelle ? `<span class="type-badge">${porteur.type_porteur_enum.libelle}</span>` : ''}
          </div>
          <table class="data-table">
            <tr>
              <td class="field-label">Type de porteur</td>
              <td class="field-value">${porteur.type_porteur_enum?.libelle || 'Non renseigné'}</td>
            </tr>
            <tr>
              <td class="field-label">Structure</td>
              <td class="field-value">${porteur.nom_structure || 'Non renseigné'}</td>
            </tr>
            <tr>
              <td class="field-label">Référent</td>
              <td class="field-value">${porteur.referent_nom || 'Non renseigné'}</td>
            </tr>
            <tr>
              <td class="field-label">Fonction du référent</td>
              <td class="field-value">${porteur.referent_fonction || 'Non renseigné'}</td>
            </tr>
            <tr>
              <td class="field-label">Email du référent</td>
              <td class="field-value">${porteur.referent_email ? `<a href="mailto:${porteur.referent_email}" style="color: #000091; text-decoration: none;">${porteur.referent_email}</a>` : 'Non renseigné'}</td>
            </tr>
            <tr>
              <td class="field-label">Téléphone du référent</td>
              <td class="field-value">${porteur.referent_tel || 'Non renseigné'}</td>
            </tr>
          </table>
        </div>
      `;
    });

    porteursHTML += '</div>';
  } else {
    porteursHTML = `
      <div class="section">
        <h2 class="section-title">Porteurs de Projet</h2>
        <div class="empty-block">Aucun porteur enregistré</div>
      </div>
    `;
  }

  // SUIVI DDT
  // 🔥 MODIFICATION : Toujours afficher la section Suivi DDT avec les infos générales
  let suivisHTML = '<div class="section"><h2 class="section-title">Suivi DDT</h2>';

  // Informations générales du Suivi DDT (toujours affichées)
  suivisHTML += `
    <div class="suivi-block">
      <table class="data-table">
        <tr>
          <td class="field-label">Projet signalé</td>
          <td class="field-value">${projet.projet_signale ? 'Oui' : 'Non'}</td>
        </tr>
        <tr>
          <td class="field-label">Charte d'Accueil</td>
          <td class="field-value">${projet.charte_accueil ? 'Oui' : 'Non'}</td>
        </tr>
        <tr>
          <td class="field-label">Service DDT</td>
          <td class="field-value">${projet.ddt_service_enum?.libelle_service || 'Non renseigné'}</td>
        </tr>
        <tr>
          <td class="field-label">Contact à la DDT</td>
          <td class="field-value">${projet.referent_ddt || 'Non renseigné'}</td>
        </tr>
        <tr>
          <td class="field-label">Date de création de la fiche projet</td>
          <td class="field-value">${projet.created_at ? new Date(projet.created_at).toLocaleString('fr-FR') : 'Non renseignée'}</td>
        </tr>
        <tr>
          <td class="field-label">Créateur de la fiche projet</td>
          <td class="field-value">${projet.creator ? `${projet.creator.prenom} ${projet.creator.nom}` : 'Non renseigné'}</td>
        </tr>
        <tr>
          <td class="field-label">Date de dernière mise à jour de la fiche projet</td>
          <td class="field-value">${projet.updated_at ? new Date(projet.updated_at).toLocaleString('fr-FR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
              }) : 'Non renseignée'}
          </td>
        </tr>
      </table>
    </div>
  `;

  // Historique des suivis (conditionnel)
  if (projet.suivis && projet.suivis.length > 0) {
    suivisHTML += `
      <div class="suivi-block">
        <div class="block-header">
          <h3 class="block-title">Historique des suivis</h3>
        </div>
        <div class="timeline-container">
    `;

    projet.suivis.forEach((suivi, idx) => {
      const dateHeure = suivi.created_at
          ? new Date(suivi.created_at).toLocaleDateString('fr-FR') + ' ' +
          new Date(suivi.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          : 'Non renseigné';
      const auteur = suivi.auteur
          ? `${suivi.auteur.prenom} ${suivi.auteur.nom}`
          : 'Non renseigné';

      suivisHTML += `
        <div class="timeline-entry">
          <div class="timeline-marker">${idx + 1}</div>
          <div class="timeline-content">
            <div class="timeline-header">
              <span class="timeline-date">${dateHeure}</span>
              <span class="timeline-author">${auteur}</span>
            </div>
            <div class="timeline-text">${suivi.suivi || 'Aucun commentaire'}</div>
          </div>
        </div>
      `;
    });

    suivisHTML += `</div></div>`;
  } else {
    // 🔥 AJOUT : Message quand il n'y a pas d'historique de suivis
    suivisHTML += `
      <div class="suivi-block">
        <div class="block-header">
          <h3 class="block-title">Historique des suivis</h3>
        </div>
        <div class="empty-block">
          <div class="empty-icon">📝</div>
          <p class="empty-message">Aucun suivi associé à ce projet</p>
        </div>
      </div>
    `;
  }

  suivisHTML += '</div>'; // Fermeture de la section


  // THÉMATIQUES
  let thematiquesHTML = '';
  if (projet.thematiques && projet.thematiques.length > 0) {
    thematiquesHTML = '<div class="section"><h2 class="section-title">Thématiques</h2>';

    projet.thematiques.forEach((them, themIdx) => {
      thematiquesHTML += `
        <div class="thematique-block">
          <div class="block-header">
            <span class="block-number">${themIdx + 1}</span>
            <h3 class="block-title">${them.libelle} - ${them.modeleDisplayName}</h3>
          </div>
      `;

      them.data.forEach((data, dataIdx) => {
        thematiquesHTML += `
          <div class="entree-block">
            <table class="data-table">
        `;

        Object.entries(data).forEach(([key, value]) => {
          thematiquesHTML += `
            <tr>
              <td class="field-label">${key}</td>
              <td class="field-value">${value}</td>
            </tr>
          `;
        });

        thematiquesHTML += `</table></div>`;
      });

      thematiquesHTML += '</div>';
    });

    thematiquesHTML += '</div>';
  } else {
    // 🔥 AJOUT : Afficher un message quand il n'y a pas de thématiques
    thematiquesHTML = `
      <div class="section">
        <h2 class="section-title">Thématiques</h2>
        <div class="empty-block">
          <div class="empty-icon">📋</div>
          <p class="empty-message">Aucune thématique associée à ce projet</p>
        </div>
      </div>
    `;
  }

  // DOCUMENTS
  let documentsHTML = '';
  if (projet.documents && projet.documents.length > 0) {
    documentsHTML = '<div class="section"><h2 class="section-title">Documents</h2>';

    projet.documents.forEach((doc, idx) => {
      // ✅ Utiliser les bons noms de propriétés
      const lienLocal = doc.lien_local || doc.lienLocal;
      const lienWeb = doc.lien_web || doc.lienWeb;

      documentsHTML += `
      <div class="porteur-block">
        <div class="block-header">
          <span class="block-number">${idx + 1}</span>
          <h3 class="block-title">Document ${idx + 1}</h3>
        </div>
        <table class="data-table">
          <tr>
            <td class="field-label">Fichier Local </td>
            <td class="field-value">
              ${lienLocal ? `<a href="${lienLocal}" style="color: #000091; text-decoration: underline;">${lienLocal}</a>` : 'Non renseigné'}
            </td>
          </tr>
          <tr>
            <td class="field-label">Lien Web </td>
            <td class="field-value">
              ${lienWeb ? `<a href="${lienWeb}" style="color: #000091; text-decoration: underline;">${lienWeb}</a>` : 'Non renseigné'}
            </td>
          </tr>
        </table>
      </div>
    `;
    });

    documentsHTML += '</div>';
  } else {
    documentsHTML = `
    <div class="section">
      <h2 class="section-title">Documents</h2>
      <div class="empty-block">
        <div class="empty-icon">📄</div>
        <p class="empty-message">Aucun document associé à ce projet</p>
      </div>
    </div>
  `;
  }


  // GÉOMÉTRIES
  let geometriesHTML = '';
  if (projet.geometry && projet.geometry.length > 0) {
    geometriesHTML = '<div class="section"><h2 class="section-title">Géométries</h2>';

    projet.geometry.forEach((geom) => {
      const areaHa = geom.area_m2 ? (parseFloat(geom.area_m2) / 10000).toFixed(2) : 'Non renseigné';

      geometriesHTML += `
        <div class="porteur-block">
          
          <table class="data-table">
            <tr>
              <td class="field-label">Longueur (m)</td>
              <td class="field-value">${geom.length_m ? parseFloat(geom.length_m).toFixed(2)  +  ' m ' : 'Non renseignée'}</td>
            </tr>
            <tr>
              <td class="field-label">Superficie (m²)</td>
              <td class="field-value">${geom.area_m2 ? parseFloat(geom.area_m2).toFixed(2) +  ' m² ' : 'Non renseignée'}</td>
            </tr>
            <tr>
              <td class="field-label">Superficie (ha)</td>
              <td class="field-value">${areaHa !== 'Non renseigné' ? areaHa + ' ha' : 'Non renseignée'}</td>
            </tr>
            <tr>
              <td class="field-label">Communes traversée(s)</td>
              <td class="field-value">${Array.isArray(geom.communes_traversees) ? geom.communes_traversees.join(', ') : (geom.communes_traversees || 'Non renseignée')}</td>
            </tr>
            <tr>
              <td class="field-label">Code(s) INSEE</td>
              <td class="field-value">${Array.isArray(geom.codes_insee) ? geom.codes_insee.join(', ') : (geom.codes_insee || 'Non renseigné')}</td>
            </tr>
            <tr>
              <td class="field-label">EPCI(s)</td>
              <td class="field-value">${geom.epci || 'Non renseigné'}</td>
            </tr>
            <tr>
              <td class="field-label">Arrondissements(s)</td>
              <td class="field-value">${Array.isArray(geom.arrondissements) ? geom.arrondissements.join(', ') : (geom.arrondissements || 'Non renseigné')}</td>
            </tr>
            <tr>
              <td class="field-label">Maire(s)</td>
              <td class="field-value">${Array.isArray(geom.maires) ? geom.maires.join(', ') : (geom.maires || 'Non renseigné')}</td>
            </tr>
            <tr>
              <td class="field-label">Député(s)</td>
              <td class="field-value">${Array.isArray(geom.deputes) ? geom.deputes.join(', ') : (geom.deputes || 'Non renseigné')}</td>
            </tr>
          </table>
        </div>
      `;
    });

    geometriesHTML += '</div>';
  } else {
    // 🔥 AJOUT : Afficher un message quand il n'y a pas de géométrie
    geometriesHTML = `
      <div class="section">
        <h2 class="section-title">Géométries</h2>
        <div class="empty-block">
          <div class="empty-icon">🗺️</div>
          <p class="empty-message">Aucune géométrie associée à ce projet</p>
        </div>
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Marianne', Arial, sans-serif;
      font-size: 12px;
      color: #2c3e50;
      line-height: 1.4;
      background: #ffffff;
      padding: 0;
      margin: 0;
    }

    .header {
      background: linear-gradient(135deg, #000091 0%, #1212FF 100%);
      color: white;
      padding: 8px 10px;
      border-radius: 4px;
      margin-bottom: 6px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .header h1 {
      font-family: 'Marianne', Arial, sans-serif;
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 2px;
    }

    .header .project-id {
      font-size: 10px;
      opacity: 0.9;
    }

    .section {
      margin-bottom: 6px;
      page-break-inside: avoid;
    }

    .section-title {
      font-family: 'Marianne', Arial, sans-serif;
      font-size: 13px;
      font-weight: 700;
      color: #000091;
      margin-bottom: 4px;
      padding-bottom: 2px;
      border-bottom: 2px solid #000091;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .type-badge {
      background: #000091;
      color: white;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 9px;
      font-weight: 700;
      margin-left: auto;
      text-transform: uppercase;
    }

    .empty-block {
      background: #f7fafc;
      border: 1px dashed #e1e8ed;
      border-radius: 4px;
      padding: 8px;
      text-align: center;
      font-size: 11px;
      color: #718096;
    }

    .info-block,
    .thematique-block,
    .porteur-block,
    .suivi-block {
      background: #ffffff;
      border: 1px solid #e1e8ed;
      border-radius: 4px;
      margin-bottom: 4px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      page-break-inside: avoid;
    }

    .block-header {
      background: #f5f7fa;
      padding: 6px 8px;
      display: flex;
      align-items: center;
      border-bottom: 2px solid #000091;
      gap: 8px;
    }

    .block-number {
      background: #000091;
      color: white;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 10px;
      flex-shrink: 0;
    }

    .block-title {
      font-family: 'Marianne', Arial, sans-serif;
      font-size: 11px;
      font-weight: 700;
      color: #2c3e50;
      margin: 0;
    }

    .entree-block {
      margin: 4px;
      border: 1px solid #e8ecf1;
      border-radius: 3px;
      overflow: hidden;
      background: #fafbfc;
    }

    .entree-header {
      background: #e8ecf1;
      padding: 3px 6px;
      font-size: 10px;
      font-weight: 700;
      color: #000091;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
    }

    .data-table tr {
      border-bottom: 1px solid #e8ecf1;
    }

    .data-table tr:last-child {
      border-bottom: none;
    }

    .field-label {
      font-family: 'Marianne',serif;
      font-weight: 700;
      color: #4a5568;
      padding: 5px 8px;
      width: 35%;
      background: #f7fafc;
      vertical-align: top;
      font-size: 11px;
    }

    .field-value {
      font-family: 'Marianne',serif;
      padding: 5px 8px;
      color: #2d3748;
      vertical-align: top;
      font-size: 11px;
      word-wrap: break-word;
    }

    .field-value a {
      color: #000091;
      text-decoration: none;
    }

    .field-value a:hover {
      text-decoration: underline;
    }

    .timeline-container {
      padding: 8px;
      background: #ffffff;
    }

    .timeline-entry {
      display: flex;
      margin-bottom: 6px;
      position: relative;
      padding-left: 8px;
      page-break-inside: avoid;
    }

    .timeline-marker {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg, #000091 0%, #1212FF 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 10px;
      flex-shrink: 0;
      margin-right: 8px;
      box-shadow: 0 1px 4px rgba(0, 0, 145, 0.2);
    }

    .timeline-content {
      flex: 1;
      background: #f7fafc;
      border: 1px solid #e1e8ed;
      border-radius: 4px;
      padding: 6px 8px;
    }

    .timeline-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e1e8ed;
    }

    .timeline-date {
      font-family: 'Marianne', serif;
      font-size: 10px;
      font-weight: 700;
      color: #000091;
      background: #e8ecf1;
      padding: 2px 6px;
      border-radius: 8px;
    }

    .timeline-author {
      font-family: 'Marianne', serif;
      font-size: 10px;
      font-weight: 500;
      color: #4a5568;
    }

    .timeline-text {
      font-family: 'Marianne', serif;
      font-size: 10px;
      color: #2d3748;
      line-height: 1.4;
    }

    @page {
      margin: 8mm 10mm;
      size: A4;
      @bottom-center {
        content: "Page " counter(page) " / " counter(pages);
        font-family: 'Marianne', serif;
        font-size: 9px;
        color: #718096;
      }
    }

    @media print {
      .section {
        page-break-inside: avoid;
        orphans: 1;
        widows: 1;
      }
      
      .info-block,
      .thematique-block,
      .porteur-block,
      .suivi-block {
        page-break-inside: avoid;
        orphans: 1;
        widows: 1;
      }

      .timeline-entry {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${projet.nom_projet || 'Sans nom'}</h1>
    <div class="project-id">ID: ${projet.id_projet}</div>
  </div>

  ${infoHTML}
  ${porteursHTML}
  ${suivisHTML}
  ${thematiquesHTML}
  ${documentsHTML}
  ${geometriesHTML}

  <div style="margin-top: 10px; padding-top: 6px; border-top: 1px solid #e1e8ed; text-align: center; font-family: 'Marianne', serif; font-size: 9px; color: #718096;">
    Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
  </div>
</body>
</html>
  `;
}
