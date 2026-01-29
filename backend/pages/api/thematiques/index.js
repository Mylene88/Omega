// Force dynamic rendering (no static generation at build time)

//backend/app/api/thematiques/route.js

import { Op } from 'sequelize';
import db from '../../../models';
import { generateModeleOptions } from '../../../lib/config';
import { saveCurrentSectionVersion, extractUserId } from '../../../lib/sectionVersionHelper';

const {
    Thematique,
    ProjetInThematique,
    Projet,
    User,
    StatutProjetEnum,
    DdtServiceEnum,
    RoleEnum
} = db;



//POST /api/thematiques



/**
 * PUT /api/thematiques
 * Met Ã  jour une thÃ©matique existante
 */


/**
 * DELETE /api/thematiques
 * Supprime une thÃ©matique ou une association thÃ©matique-projet
 */



/**
 * OPTIONS - Pour CORS si nÃ©cessaire
 */

export default async function handler(req, res) {
  if (req.method === 'GET') {

  try {
    // Query params available in req.query
    const projetId = req.query.projetId;
    const includeModels = req.query.models === 'true';
    
    let queryOptions = {
      attributes: ['id_thematique', 'libelle', 'modele'],
      order: [['libelle', 'ASC']]
    };

    if (projetId) {
      queryOptions.include = [{
        model: ProjetInThematique,
        where: { id_projet: projetId },
        include: [
          {
            model: User,
            foreignKey: 'ajoute_par',
            attributes: ['id_user', 'prenom', 'nom', 'username'],
            include: [{
              model: RoleEnum,
              foreignKey: 'role_id',
              attributes: ['id_role', 'libelle']
            }]
          },
          {
            model: Projet,
            foreignKey: 'id_projet',
            attributes: ['id_projet', 'nom_projet', 'statut_projet_id'],
            include: [{
              model: StatutProjetEnum,
              foreignKey: 'statut_projet_id',
              attributes: ['id_statut_projet', 'libelle']
            }]
          }
        ]
      }];
    }

    const thematiques = await Thematique.findAll(queryOptions);

    let responseData = {
      success: true,
      data: thematiques,
      count: thematiques.length,
      timestamp: new Date().toISOString()
    };

    // ✅ Ajout des options de modèles depuis index.js
    if (includeModels) {
      try {
        // Récupérer toutes les options de modèles depuis la config centralisée
        const modelOptions = generateModeleOptions();
        
        // Ajouter au response
        responseData.modelOptions = modelOptions;
        
        console.log(`✅ Added ${modelOptions.length} model options from config`);
      } catch (modelError) {
        console.error('❌ Error generating model options:', modelError);
        // Ne pas faire échouer la requête si les modèles ne peuvent pas être chargés
        responseData.modelOptions = [];
      }
    }

    return res.json(responseData);

  } catch (error) {
    console.error('💥 Erreur GET /api/thematiques:', error);
    return res.json({
      success: false,
      message: 'Erreur lors de la récupération des thématiques',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
  }
  else if (req.method === 'POST') {

    const transaction = await db.sequelize.transaction();

    try {
        const body = req.body;
        const { libelle, modele, projetId, userId, thematiqueId } = body;
        const requestUserId = extractUserId(req, body) || userId;

        // Cas 1: Association d'une thÃ©matique existante Ã  un projet
        if (thematiqueId && projetId) {
            // VÃ©rifier que la thÃ©matique existe
            const thematique = await Thematique.findByPk(thematiqueId, { transaction });
            if (!thematique) {
                await transaction.rollback();
                return res.json({
                    success: false,
                    message: 'Thématique non trouvée'
                }, { status: 404 });
            }

            // VÃ©rifier que le projet existe
            const projet = await Projet.findByPk(projetId, { transaction });
            if (!projet) {
                await transaction.rollback();
                return res.json({
                    success: false,
                    message: 'Projet non trouvÃ©'
                }, { status: 404 });
            }

            // VÃ©rifier si l'association existe dÃ©jÃ
            const existingAssociation = await ProjetInThematique.findOne({
                where: {
                    id_projet: projetId,
                    id_thematique: thematiqueId
                },
                transaction
            });

            // 📸 Sauvegarder la version actuelle avant ajout
            if (requestUserId && projetId) {
                await saveCurrentSectionVersion({
                    idProjet: projetId,
                    userId: requestUserId,
                    sectionName: 'thematiques',
                    description: 'Association d\'une thématique au projet',
                    transaction
                });
            }

            // CrÃ©er l'association
            const nouvelleAssociation = await ProjetInThematique.create({
                id_projet: projetId,
                id_thematique: thematiqueId,
                ajoute_par: userId || null,
                date_ajout: new Date()
            }, { transaction });

            // RÃ©cupÃ©rer l'association complÃ¨te avec les donnÃ©es liÃ©es
            const associationComplete = await ProjetInThematique.findByPk(nouvelleAssociation.id, {
                include: [
                    { model: Thematique, attributes: ['id_thematique','libelle','modele'] },
                    { model: Projet,     attributes: ['id_projet','nom_projet'] },
                    { model: User,       foreignKey: 'ajoute_par', attributes: ['id_user','prenom','nom'] }
                ],
                transaction
            });

            await transaction.commit();

            return res.json({
                success: true,
                data: associationComplete,
                message: 'Thématique associée au projet avec success'
            }, { status: 201 });
        }

        // Cas 2: CrÃ©ation d'une nouvelle thÃ©matique
        if (!libelle?.trim()) {
            await transaction.rollback();
            return res.json({
                success: false,
                message: 'Le libellÃ© de la thÃ©matique est requis'
            }, { status: 400 });
        }

        // VÃ©rifier si la thÃ©matique existe dÃ©jÃ
        const existingThematique = await Thematique.findOne({
            where: { libelle: libelle.trim() },
            transaction
        });

        if (existingThematique) {
            await transaction.rollback();
            return res.json({
                success: false,
                message: 'Une thÃ©matique avec ce libellÃ© existe dÃ©jÃ ',
                existingThematique: {
                    id: existingThematique.id_thematique,
                    libelle: existingThematique.libelle,
                    modele: existingThematique.modele
                }
            }, { status: 409 });
        }

        // CrÃ©er la nouvelle thÃ©matique
        const nouvelleThematique = await Thematique.create({
            libelle: libelle.trim(),
            modele: modele ? JSON.stringify(modele) : null
        }, { transaction });

        // Si un projetId est fourni, crÃ©er Ã©galement l'association
        if (projetId) {
            // 📸 Sauvegarder la version actuelle avant ajout
            if (requestUserId) {
                await saveCurrentSectionVersion({
                    idProjet: projetId,
                    userId: requestUserId,
                    sectionName: 'thematiques',
                    description: 'Création et association d\'une nouvelle thématique',
                    transaction
                });
            }

            await ProjetInThematique.create({
                id_projet: projetId,
                id_thematique: nouvelleThematique.id_thematique,
                ajoute_par: userId || null,
                date_ajout: new Date()
            }, { transaction });
        }

        await transaction.commit();

        return res.json({
            success: true,
            data: nouvelleThematique,
            message: projetId ?
                'ThÃ©matique crÃ©Ã©e et associÃ©e au projet avec success' :
                'ThÃ©matique crÃ©Ã©e avec success'
        }, { status: 201 });

    } catch (error) {
        await transaction.rollback();
        console.error('Erreur POST /api/thematiques:', error);
        return res.json({
            success: false,
            message: 'Erreur lors de la création/association de la thématique',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
  }
  else if (req.method === 'PUT') {

    try {
        const body = req.body;
        const { id_thematique, libelle, modele, userId } = body;

        if (!id_thematique) {
            return res.json({
                success: false,
                message: 'ID de la thématique requis'
            }, { status: 400 });
        }

        const thematique = await Thematique.findByPk(id_thematique);

        if (!thematique) {
            return res.json({
                success: false,
                message: 'Thématique non trouvée'
            }, { status: 404 });
        }

        // PrÃ©parer les donnÃ©es de mise Ã  jour
        const updateData = {};
        if (libelle !== undefined) {
            if (!libelle.trim()) {
                return res.json({
                    success: false,
                    message: 'Le libelle ne peut pas être vide'
                }, { status: 400 });
            }
            updateData.libelle = libelle.trim();
        }

        if (modele !== undefined) {
            updateData.modele = modele ? JSON.stringify(modele) : null;
        }

        // VÃ©rifier l'unicitÃ© du libellÃ© si il est modifiÃ©
        if (updateData.libelle && updateData.libelle !== thematique.libelle) {
            const existingThematique = await Thematique.findOne({
                where: {
                    libelle: updateData.libelle,
                    id_thematique: { [Op.ne]: id_thematique }
                }
            });

            if (existingThematique) {
                return res.json({
                    success: false,
                    message: 'Une autre thématique avec ce libelle existe déjà '
                }, { status: 409 });
            }
        }

        // Effectuer la mise Ã  jour
        await thematique.update(updateData);

        // RÃ©cupÃ©rer la thÃ©matique mise Ã  jour
        const thematiqueUpdated = await Thematique.findByPk(id_thematique);

        return res.json({
            success: true,
            data: thematiqueUpdated,
            message: 'Thématique mise à  jour avec succes'
        });

    } catch (error) {
        console.error('Erreur PUT /api/thematiques:', error);
        return res.json({
            success: false,
            message: 'Erreur lors de la mise Ã  jour de la thématique',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
  }
  else if (req.method === 'DELETE') {

  const transaction = await db.sequelize.transaction();

  try {
    // Query params available in req.query
    const pitId       = req.query.pitId;           // ✅ préféré
    const projetId    = req.query.projetId;
    const id_thematique = req.query.id;            // id de thématique
    const force       = req.query.force === 'true';
    const userId      = parseInt(req.query.userId, 10) || null;

    // 1) ✅ Suppression ciblée par PK technique
    if (pitId) {
      const association = await ProjetInThematique.findByPk(pitId, { transaction });
      if (!association) {
        await transaction.rollback();
        return res.json({ success: false, message: 'Association non trouvée' }, { status: 404 });
      }

      // 📸 Sauvegarder la version actuelle avant suppression
      if (userId && association.id_projet) {
        await saveCurrentSectionVersion({
          idProjet: association.id_projet,
          userId,
          sectionName: 'thematiques',
          description: 'Suppression d\'une association thématique',
          transaction
        });
      }

      await association.destroy({ transaction });
      await transaction.commit();
      return res.json({ success: true, message: 'Association thématique-projet supprimée' });
    }

    // 2) Fallback historique: une association (projet, thématique)
    if (projetId && id_thematique) {
      const association = await ProjetInThematique.findOne({
        where: { id_projet: projetId, id_thematique },
        transaction
      });
      if (!association) {
        await transaction.rollback();
        return res.json({ success: false, message: 'Association thématique-projet non trouvée' }, { status: 404 });
      }

      // 📸 Sauvegarder la version actuelle avant suppression
      if (userId && projetId) {
        await saveCurrentSectionVersion({
          idProjet: projetId,
          userId,
          sectionName: 'thematiques',
          description: 'Suppression d\'une association thématique',
          transaction
        });
      }

      await association.destroy({ transaction });
      await transaction.commit();
      return res.json({ success: true, message: 'Association thématique-projet supprimée avec succès' });
    }

    // 3) Suppression d'une thématique du catalogue (option "force")
    // Pas de versioning ici car c'est la suppression du catalogue global, pas d'un projet
    if (!id_thematique) {
      await transaction.rollback();
      return res.json({ success: false, message: 'ID de la thématique requis' }, { status: 400 });
    }
    const thematique = await Thematique.findByPk(id_thematique, { transaction });
    if (!thematique) {
      await transaction.rollback();
      return res.json({ success: false, message: 'Thématique non trouvée' }, { status: 404 });
    }
    const associationsCount = await ProjetInThematique.count({ where: { id_thematique }, transaction });
    if (associationsCount > 0 && !force) {
      await transaction.rollback();
      return res.json({
        success: false,
        message: `Impossible de supprimer la thématique : ${associationsCount} projet(s) associée(s)`,
        associatedProjects: associationsCount,
        canForceDelete: true,
        hint: 'Utilisez le paramètre force=true pour forcer la suppression'
      }, { status: 409 });
    }
    await thematique.destroy({ transaction }); // ON DELETE CASCADE sur la FK nettoiera les liaisons
    await transaction.commit();
    return res.json({
      success: true,
      message: `Thématique supprimée avec succès${associationsCount ? ` (${associationsCount} associations supprimées)` : ''}`,
      deletedAssociations: associationsCount
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur DELETE /api/thematiques:', error);
    return res.json({ success: false, message: 'Erreur lors de la suppression' }, { status: 500 });
  }
  }
  else if (req.method === 'OPTIONS') {

    return res.json({}, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
        },
    });
  }
  else {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}