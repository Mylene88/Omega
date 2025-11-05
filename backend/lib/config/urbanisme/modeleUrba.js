//backend/lib/config/Urbanisme/modeleUrba.js


const modeleUrbanisme = {
  
    'autorisation_urbanisme': {
      tableName: 'autorisation_urbanisme',
      schema: 'urbanisme',
      displayName: 'Autorisation d\'urbanisme',
      primaryKey: 'id_autorisation',
      fields: [
        { 
          name: 'procedure_id', 
          label: 'Procédure', 
          type: 'checkbox-single', 
          enumTable: 'procedure_enum',
          enumSchema: 'urbanisme',
          required: false 
        },
        { 
          name: 'service_instructeur', 
          label: 'Service instructeur', 
          type: 'text',
          placeholder: 'Ex: ELI, DDT, Agglo, Commune',
          required: false 
        },
        { 
          name: 'objet_autorisation', 
          label: 'Objet de l\'autorisation', 
          type: 'textarea',
          placeholder: 'Décrivez l\'élément du projet soumis à autorisation.',
          tooltip: 'PV, logistique, usine, hangar, agricole',
          
          required: true 
        },
        { 
          name: 'numero_dossier', 
          label: 'Numéro de dossier', 
          type: 'text',
          placeholder: 'Indiquez le numéro unique de la procédure',
          tooltip: 'Ex: PC 028 085 25 00001',
          required: false 
        },
        { 
          name: 'date_depot', 
          label: 'Date de dépôt', 
          type: 'date',
          required: false 
        },
        { 
          name: 'avis_cdpenaf', 
          label: 'Avis CDPENAF', 
          type: 'textarea',
          placeholder: 'Indiquez la date de l\'avis',
          tooltip: 'Indiquez la date et l\'avis',
          required: false 
        },
        { 
          name: 'decision_id', 
          label: 'Décision', 
          type: 'checkbox-single',
          enumTable: 'decision_autorisation_enum',
          enumSchema: 'urbanisme',
          tooltip: 'Indiquez la décision sur la procédure',
          required: false 
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
          rows: 6,
          type: 'textarea',
          required: false 
        }
      ]
    },
    'planification': {
      tableName: 'planification',
      schema: 'urbanisme',
      displayName: 'Planification',
      primaryKey: 'id_planification',
      fields: [
        { 
          name: 'document_id', 
          label: 'Document d\'urbanisme', 
          type: 'select',
          enumTable: 'document_urbanisme_enum',
          enumSchema: 'urbanisme',
          required: true 
        },
        { 
          name: 'motifs_incompatibilite', 
          label: 'Motifs d\'incompatibilité', 
          type: 'textarea',
          rows: 6,
          placeholder: 'Ex: activité non autorisée par le zonage',
          required: false 
        },
        {
            name: 'procedure_compatibilite_id',
            label: 'Procédure de mise en compatibilité',
            type: 'checkbox-multiple',
            enumTable: 'procedure_compatibilite_enum',
            enumSchema: 'urbanisme',
            relationTable: 'planification_procedure_compatibilite',  
            tooltip: 'Indiquez le type de procédure permettant de lever les motifs d\'incompatibilité',
            required: false
        },

        { 
          name: 'avancement_id', 
          label: 'Avancement de la procédure', 
          type: 'checkbox-single',
          enumTable: 'avancement_procedure_enum',
          enumSchema: 'urbanisme',
          required: false 
        },
        { 
          name: 'date', 
          label: 'Date', 
          type: 'date',
          required: false 
        },
        { 
          name: 'avis_cdpenaf', 
          label: 'Avis CDPENAF', 
          type: 'textarea',
          tooltip: 'Indiquez la décision sur la procédure',
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
    'habitat': {
      tableName: 'habitat',
      schema: 'urbanisme',
      displayName: 'Habitat',
      primaryKey: 'id_habitat',
      fields: [
        { 
          name: 'commentaires', 
          label: 'Commentaires', 
          type: 'textarea',
          rows: 6,
          required: false 
        }
      ]
    },
    'gdv': {
      tableName: 'gdv',
      schema: 'urbanisme',
      displayName: 'Gens de voyage',
      primaryKey: 'id_gdv',
      fields: [
        { 
          name: 'conformite_id', 
          label: 'Conformité SDAGDV', 
          type: 'select',
          enumTable: 'conformite_sdagdv_enum',
          enumSchema: 'urbanisme',
          required: false 
        },
        { 
          name: 'commentaires', 
          label: 'Commentaires', 
          type: 'textarea',
          rows: 6,
          required: false 
        }
      ]
    },
    'police_urbanisme': {   
      tableName: 'police_urbanisme',
      schema: 'urbanisme',
      displayName: 'Police de l\'urbanisme',
      primaryKey: 'id_police',
      fields: [
        { 
          name: 'commentaires', 
          label: 'Commentaires', 
          type: 'textarea',
          rows: 6,
          required: false 
        }
    
     ]
    }
}

// Export CommonJS
module.exports = modeleUrbanisme;