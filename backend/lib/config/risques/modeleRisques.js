// backend/lib/config/risques/modeleRisques.js

const modeleRisques = {
  'ruissellement': {
    tableName: 'ruissellement',
    schema: 'risques',
    primaryKey: 'id_ruissellement',
    displayName: 'Ruissellement',
    fields: [
      { 
        name: 'commentaires', 
        label: 'Commentaires', 
        type: 'textarea',
        required: false 
      }
    ]
  },
  'bruit': {
    tableName: 'bruit',
    schema: 'risques',
    primaryKey: 'id_bruit',
    displayName: 'Bruit',
    fields: [
      { 
        name: 'commentaires', 
        label: 'Commentaires', 
        type: 'textarea',
        required: false 
      }
    ]
  },
  'zonesinond': {
    tableName: 'zonesinond',
    schema: 'risques',
    primaryKey: 'id_zonesinond',
    displayName: 'Zones Inondables',
    fields: [
      { 
        name: 'commentaires', 
        label: 'Commentaires', 
        type: 'textarea',
        required: false 
      }
    ]
  },
  'cavites': {
    tableName: 'cavites',
    schema: 'risques',
    primaryKey: 'id_cavites',
    displayName: 'Cavites',
    fields: [
      { 
        name: 'commentaires', 
        label: 'Commentaires', 
        type: 'textarea',
        required: false 
      }
    ]
  },
  'rga': {
    tableName: 'rga',
    schema: 'risques',
    primaryKey: 'id_rga',
    displayName: 'Retrait Gonflement D\'Argile',
    fields: [
      { 
        name: 'commentaires', 
        label: 'Commentaires', 
        type: 'textarea',
        required: false 
      }
    ]
  },
  'incendie': {
    tableName: 'incendie',
    schema: 'risques',
    primaryKey: 'id_incendie',
    displayName: 'Incendie',
    fields: [
      { 
        name: 'commentaires', 
        label: 'Commentaires', 
        type: 'textarea',
        required: false 
      }
    ]
  }
};

module.exports = modeleRisques;
