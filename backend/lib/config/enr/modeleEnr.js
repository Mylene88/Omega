const modeleEnr = {
  'eolien': {
    tableName: 'eolien',
    schema: 'enr',
    primaryKey: 'id_eolien',
    displayName: 'Eolien',
    fields: [
      {
        name: 'commentaires',
        label: 'Commentaires',
        type: 'textarea',
        required: false,
        rows: 4,
      }
    ]
  },

  'pv_agri_pv': {
    tableName: 'pv_agri_pv',
    schema: 'enr',
    primaryKey: 'id',
    displayName: 'PV et Agri-PV',
    fields: [
      {
        name: 'type_installation_id',
        label: 'Type d\'installation',
        type: 'checkbox-single',
        enumTable: 'type_installation_enum',
        enumSchema: 'enr',
        required: false
      },
      {
        name: 'zone_acceleration_id',
        label: 'Projet en zone d\'accélération',
        type: 'select',
        enumTable: 'projet_zone_acc_enum',
        enumSchema: 'enr',
        required: false
      },
      {
        name: 'document_cadre_id',
        label: 'Document cadre',
        type: 'checkbox-single',
        enumTable: 'doc_cadre_enum',
        enumSchema: 'enr',
        required: false
      },
      {
        name: 'puissance_mw',
        label: 'Puissance (MW)',
        type: 'number',
        min: 0.00000001,
        step: 0.001,
        required: false
      },
      {
        name: 'surface_totale_ha',
        label: 'Surface totale du projet (ha)',
        type: 'number',
        min: 0.00000001,
        step: 0.01,
        required: false
      },
      {
        name: 'raccordement',
        label: 'Raccordement',
        type: 'text',
        required: false,
        tooltip: 'Renseignez le nom du poste source et/ou sa distance'
      },
      {
        name: 'type_sol_id',
        label: 'Types de sol',
        type: 'checkbox-multiple',
        enumTable: 'type_sol_enum',
        enumSchema: 'enr',
        relationTable: 'pv_type_sol',
        required: false
      },
      {
        name: 'date_comite_projet',
        label: 'Date du comité projet',
        type: 'date',
        required: false,
        tooltip: 'Précisez la date du comité lorsqu\'il y en a eu plusieurs'
      },
      {
        name: 'etat_avancement_id',
        label: 'État d\'avancement',
        type: 'select',
        enumTable: 'etat_avancement_enum',
        enumSchema: 'enr',
        defaultValue: 1,
        required: false
      },
      {
        name: 'commentaires',
        label: 'Commentaires',
        type: 'textarea',
        rows: 4,
        required: false
      }
    ]
  },

  'methanisation': {
    tableName: 'methanisation',
    schema: 'enr',
    primaryKey: 'id_methanisation',
    displayName: 'Méthanisation',
    fields: [
      {
        name: 'type_methaniseur_id',
        label: 'Type de méthaniseur',
        type: 'select',
        enumTable: 'type_methaniseur_enum',
        enumSchema: 'enr',
        required: false
      },
      {
        name: 'origine_intrants_id',
        label: 'Origine des intrants',
        type: 'checkbox-multiple',
        enumTable: 'origine_intrants_enum',
        enumSchema: 'enr',
        relationTable: 'methanisation_origine_intrants',  
        required: false
      },
      {
        name: 'instructeur_icpe_id',
        label: 'Instructeur ICPE',
        type: 'checkbox-single',
        enumTable: 'instructeur_icpe_enum',
        enumSchema: 'enr',
        required: false
      },
      {
        name: 'regime_icpe_id',
        label: 'Régime ICPE',
        type: 'checkbox-multiple',
        enumTable: 'regime_icpe_enum',
        enumSchema: 'enr',
        relationTable: 'methanisation_regime_icpe',  // ✅ Table de jonction
        required: false
      },
      {
        name: 'etat_avancement_id',
        label: 'État d\'avancement',
        type: 'select',
        enumTable: 'etat_avancement_enum',
        enumSchema: 'enr',
        required: false
      },
      {
        name: 'commentaires',
        label: 'Commentaires',
        type: 'textarea',
        rows: 4,
        required: false
      }
    ]
  },

  'stockage_batterie': {
    tableName: 'stockage_batterie',
    schema: 'enr',
    primaryKey: 'id_stockage_batterie',
    displayName: 'Stockage batterie',
    fields: [
      {
        name: 'puissance_mw',
        label: 'Puissance (MW)',
        type: 'number',
        step: 0.001,
        required: false
      },
      {
        name: 'surface_totale_ha',
        label: 'Surface totale (ha)',
        type: 'number',
        step: 0.01,
        required: false
      },
      {
        name: 'type_sol',
        label: 'Type de sol',
        type: 'text',
        required: false,
        tooltip: 'Ex: zone urbaine, terres agricoles, friches, etc'
      },
      {
        name: 'etat_avancement_id',
        label: 'État d\'avancement',
        type: 'select',
        enumTable: 'etat_avancement_enum',
        enumSchema: 'enr',
        required: false
      },
      {
        name: 'commentaires',
        label: 'Commentaires',
        type: 'textarea',
        rows: 4,
        required: false
      }
    ]
  }
};

module.exports = modeleEnr;
