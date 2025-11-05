// backend/lib/config/environnement/modeleEnvironnement.js

const modeleEnvironnement = {
  'derogation_espece_protegee': {
    tableName: 'derogation_espece_protegee',
    schema: 'environnement',
    primaryKey: 'id_derogation',
    displayName: 'Dérogation espèce protégée - DEP',
    fields: [
      { 
        name: 'espece_protegee', 
        label: 'Espèce(s) protégée(s)', 
        type: 'textarea',
        required: false,
        placeholder: 'Indiquez les espèces protégées ou susceptibles d\'être protégées sur le site',
      },
      { 
        name: 'necessite_dep_id', 
        label: 'Nécessite une DEP', 
        type: 'select',
        enumTable: 'necessite_dep_enum',
        enumSchema: 'environnement',
        required: false 
      },
      { 
        name: 'numero_dossier', 
        label: 'Numéro de dossier', 
        type: 'text',
        required: false,
        placeholder: 'Ex: DEP-2025-001'
      },
      { 
        name: 'date_depot', 
        label: 'Date de dépôt du dossier', 
        type: 'date',
        required: false 
      },
      { 
        name: 'decision', 
        label: 'Décision', 
        type: 'textarea',
        required: false,
        rows: 6,
        placeholder: 'Renseignez la décision et les mesures compensatoires, le cas échéant'
      },
      { 
        name: 'date_decision', 
        label: 'Date de décision', 
        type: 'date',
        required: false
      },
      { 
        name: 'commentaires', 
        label: 'Commentaires', 
        type: 'textarea',
        required: false,
        rows: 6
      }
    ]
  },
  'defrichement': {
    tableName: 'defrichement',
    schema: 'environnement',
    primaryKey: 'id_defrichement',
    displayName: 'Défrichement',
    fields: [
      { 
        name: 'surface_impactee', 
        label: 'Surface impactée', 
        type: 'text',
        required: false,
        rows: 2,
        tooltip: 'Il s\'agit de la surface impactée ou susceptible d\'être défrichée',

      },
      { 
        name: 'necessite_autorisation_id', 
        label: 'Nécessite une autorisation de défrichement', 
        type: 'select',
        enumTable: 'necessite_defrichement_enum',
        enumSchema: 'environnement',
        required: false 
      },
      { 
        name: 'numero_dossier', 
        label: 'Numéro de dossier', 
        type: 'text',
        required: false
      },
      { 
        name: 'date_depot', 
        label: 'Date de dépôt', 
        type: 'date',
        required: false 
      },
      { 
        name: 'decision', 
        label: 'Décision', 
        type: 'textarea',
        required: false,
        rows: 6,
        placeholder: 'Renseignez la décision et les mesures compensatoires, le cas échéant'
      },
      { 
        name: 'date_decision', 
        label: 'Date de décision', 
        type: 'date',
        required: false 
      },
      { 
        name: 'commentaires', 
        label: 'Commentaires', 
        type: 'textarea',
        required: false,
        rows: 6
      }
    ]
  },
  'loi_sur_leau': {
    tableName: 'loi_sur_leau',
    schema: 'environnement',
    primaryKey: 'id_loi_eau',
    displayName: 'Loi sur l\'eau',
    fields: [
      { 
        name: 'rubrique_eau', 
        label: 'Rubrique', 
        type: 'text',
        rows: 4,
        required: false,
        tooltip: 'Indiquez la rublique et/ou son libellé. Ex: 2.1.5.0 Eau pluviale; 3.3.1.0 Zones humides'
      },
      { 
        name: 'regime_id', 
        label: 'Régime', 
        type: 'select',
        enumTable: 'regime_eau_enum',
        enumSchema: 'environnement',
        required: false 
      },
      { 
        name: 'numero_dossier', 
        label: 'Numéro de dossier', 
        type: 'text',
        required: false
        
      },
      { 
        name: 'statut_id', 
        label: 'Statut', 
        type: 'select',
        enumTable: 'statut_eau_enum',
        enumSchema: 'environnement',
        required: false 
      },
      { 
        name: 'date_depot', 
        label: 'Date de dépôt', 
        type: 'date',
        required: false 
      },
      { 
        name: 'decision', 
        label: 'Décision', 
        type: 'textarea',
        required: false,
        rows: 4,
        placeholder: 'Décision et précisions, le cas échéant'
      },
      { 
        name: 'date_decision', 
        label: 'Date de décision', 
        type: 'date',
        required: false 
      },
      { 
        name: 'commentaires', 
        label: 'Commentaires', 
        type: 'textarea',
        required: false,
        rows: 6
      }
    ]
  },
  'assainissement': {
    tableName: 'assainissement',
    schema: 'environnement',
    primaryKey: 'id_assainissement',
    displayName: 'Assainissement',
    fields: [
      { 
        name: 'commentaires', 
        label: 'Commentaires', 
        type: 'textarea',
        required: false,
        rows: 4
      }
    ]
  },
  'evaluation_environnementale': {
    tableName: 'evaluation_environnementale',
    schema: 'environnement',
    primaryKey: 'id_evaluation',
    displayName: 'Évaluation environnementale - EE',
    fields: [
      { 
        name: 'regime_id', 
        label: 'Régime', 
        type: 'select',
        enumTable: 'regime_evaluation_env_enum',
        enumSchema: 'environnement',
        required: true 
      },
      { 
        name: 'rubriques_ee', 
        label: 'Rubrique', 
        type: 'text',
        required: false,
        placeholder: 'Ex: 15 - Recifs artificiels'
      },
      { 
        name: 'quelle_procedure_ee', 
        label: 'Quelle procédure porte l\'EE ?', 
        type: 'text',
        rows: 6,
        required: false,
       placeholder: 'Ex: PC, ICPE, Loi sur l\'eau, MECDU'
      },
      { 
        name: 'date_contrib_ddt_mrae', 
        label: 'Date de contribution DDT à la MRAE', 
        type: 'date',
        required: false 
      },
      { 
        name: 'avis_mrae', 
        label: 'Avis MRAE', 
        type: 'textarea',
        required: false,
        rows: 6,
        tooltip: 'Précisez en quelques mots la position de la MRAE'
      },
      { 
        name: 'commentaires', 
        label: 'Commentaires', 
        type: 'textarea',
        required: false,
        rows: 6
      }
    ]
  }
};

module.exports = modeleEnvironnement;

