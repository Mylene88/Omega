// backend/lib/config/autres/modeleAutres.js

const modeleAutres = {
  'compensation_agricole_collective': {
    tableName: 'compensation_agricole_collective',
    schema: 'autres',
    primaryKey: 'id_compensation',
    displayName: 'Compensation Agricole Collective',
    fields: [
      { 
        name: 'soumis_id', 
        label: 'Soumis', 
        type: 'select',
        enumTable: 'soumis_enum',
        enumSchema: 'autres',
        required: false 
      },
      { 
        name: 'avis_cdpenaf_id', 
        label: 'Avis CDPENAF', 
        type: 'checkbox-single',
        enumTable: 'avis_cdpenaf_enum',
        enumSchema: 'autres',
        required: false 
      },
      { 
        name: 'avis_prefet_id', 
        label: 'Avis Préfet', 
        type: 'checkbox-single',
        enumTable: 'avis_prefet_enum',
        enumSchema: 'autres',
        required: false 
      },
      { 
        name: 'montant', 
        label: 'Montant (€)', 
        type: 'currency',
        min: 0,
        step: 0.01,
        required: false,
        validation: {
          isCurrency: true,
          min: 0
        },
      },
      { 
        name: 'destinataire_compensation', 
        label: 'Destinataire de la compensation', 
        type: 'text',
        required: false,
        tooltip: 'Il peut s\'agir du Fonds ADEL ou d\'un projet'
      },
      { 
        name: 'commentaires', 
        label: 'Commentaires', 
        type: 'textarea',
        required: false,
        rows: 4
      }
    ]
  },
  'participation_du_public': {
    tableName: 'participation_du_public',
    schema: 'autres',
    primaryKey: 'id_participation',
    displayName: 'Participation du public',
    fields: [
      { 
        name: 'type_participation_id', 
        label: 'Type', 
        type: 'select',
        enumTable: 'type_participation_enum',
        enumSchema: 'autres',
        required: false 
      },
      { 
        name: 'debut_participation_public', 
        label: 'Début de la participation du public', 
        type: 'date',
        required: false 
      },
      { 
        name: 'fin_participation_public', 
        label: 'Fin de la participation du public', 
        type: 'date',
        required: false,
        validation: {
          isAfter: 'debut_participation'
        }
      },
      { 
        name: 'organisateur_participation_id', 
        label: 'Organisateur de la participation du public', 
        type: 'select',
        enumTable: 'organisateur_participation_enum',
        enumSchema: 'autres',
        required: false 
      },
      { 
        name: 'avis_commissaire_enqueteur_id', 
        label: 'Avis commissaire enquêteur', 
        type: 'select',
        enumTable: 'avis_commissaire_enqueteur_enum',
        enumSchema: 'autres',
        required: false 
      },
      { 
        name: 'commentaires', 
        label: 'Commentaires', 
        type: 'textarea',
        required: false,
        rows: 4,
        placeholder: 'Détails sur la participation du public'
      }
    ]
  },
  'icpe': {
    tableName: 'icpe',
    schema: 'autres',
    primaryKey: 'id_icpe',
    displayName: 'ICPE',
    fields: [
      { 
        name: 'regime_id', 
        label: 'Régime', 
        type: 'select',
        enumTable: 'regime_icpe_enum',
        enumSchema: 'autres',
        required: false 
      },
      { 
        name: 'rubriques', 
        label: 'Rubriques', 
        type: 'text',
        required: false
       
      },
      { 
        name: 'decision', 
        label: 'Décision', 
        type: 'textarea',
        required: false,
        rows: 3
       
      },
      { 
        name: 'commentaires', 
        label: 'Commentaires', 
        type: 'textarea',
        required: false,
        rows: 4
      }
    ]
  }
};

module.exports = modeleAutres;
