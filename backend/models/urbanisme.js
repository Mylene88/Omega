// backend/models/urbanisme.js

module.exports = (sequelize, DataTypes, { Projet, Thematique, User }) => {
  const schema = 'urbanisme';

  const ProcedureEnum = sequelize.define('procedure_enum', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    value: { type: DataTypes.TEXT, allowNull: false }
  }, {
    schema,
    tableName: 'procedure_enum',
    timestamps: false });

  const DecisionAutorisationEnum = sequelize.define('decision_autorisation_enum', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    value: { type: DataTypes.TEXT, allowNull: false }
  }, {
    schema,
    tableName: 'decision_autorisation_enum',
    timestamps: false });

  const DocumentUrbanismeEnum = sequelize.define('document_urbanisme_enum', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    value: { type: DataTypes.TEXT, allowNull: false }
  }, {
    schema,
    tableName: 'document_urbanisme_enum',
    timestamps: false });

  const ProcedureCompatibiliteEnum = sequelize.define('procedure_compatibilite_enum', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    value: { type: DataTypes.TEXT, allowNull: false }
  }, {
    schema,
    tableName: 'procedure_compatibilite_enum',
    timestamps: false });

  const AvancementProcedureEnum = sequelize.define('avancement_procedure_enum', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    value: { type: DataTypes.TEXT, allowNull: false }
  }, {
    schema,
    tableName: 'avancement_procedure_enum',
    timestamps: false });

  const ConformiteSdagdvEnum = sequelize.define('conformite_sdagdv_enum', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    value: { type: DataTypes.TEXT, allowNull: false }
  }, {
    schema,
    tableName: 'conformite_sdagdv_enum',
    timestamps: false });

  const AutorisationUrbanisme = sequelize.define('autorisation_urbanisme', {
    id_autorisation: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_project: { type: DataTypes.STRING, references: { model: Projet, key: 'id_projet' }, onDelete: 'CASCADE' },
    id_thematique: { type: DataTypes.INTEGER, references: { model: Thematique, key: 'id_thematique' } },
    procedure_id: { type: DataTypes.INTEGER, references: { model: ProcedureEnum, key: 'id' } },
    service_instructeur: { type: DataTypes.TEXT },
    objet_autorisation: { type: DataTypes.TEXT, allowNull: false },
    numero_dossier: { type: DataTypes.TEXT },
    date_depot: { type: DataTypes.DATE },
    avis_cdpenaf: { type: DataTypes.TEXT },
    decision_id: { type: DataTypes.INTEGER, references: { model: DecisionAutorisationEnum, key: 'id' } },
    date_decision: { type: DataTypes.DATE },
    commentaires: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE },
    created_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } },
    updated_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } }
  }, {
    schema,
    tableName: 'autorisation_urbanisme',
    timestamps: false
  });

  const Planification = sequelize.define('planification', {
    id_planification: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_project: { type: DataTypes.STRING, references: { model: Projet, key: 'id_projet' }, onDelete: 'CASCADE' },
    id_thematique: { type: DataTypes.INTEGER, references: { model: Thematique, key: 'id_thematique' } },
    document_id: { type: DataTypes.INTEGER, references: { model: DocumentUrbanismeEnum, key: 'id' } },
    motifs_incompatibilite: { type: DataTypes.TEXT },
    //procedure_compatibilite_id: { type: DataTypes.INTEGER, references: { model: ProcedureCompatibiliteEnum, key: 'id' } },
    avancement_id: { type: DataTypes.INTEGER, references: { model: AvancementProcedureEnum, key: 'id' } },
    date: { type: DataTypes.DATE },
    avis_cdpenaf: { type: DataTypes.TEXT },
    commentaires: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE },
    created_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } },
    updated_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } }
  }, {
    schema,
    tableName: 'planification',
    timestamps: false
  });

  const PlanificationProcedureCompatibilite = sequelize.define('planification_procedure_compatibilite', {
    id_planification: { type: DataTypes.INTEGER, references: { model: Planification, key: 'id_planification' }, onDelete: 'CASCADE', primaryKey: true },
    id_procedure_compatibilite: { type: DataTypes.INTEGER, references: { model: ProcedureCompatibiliteEnum, key: 'id' }, onDelete: 'CASCADE', primaryKey: true }
  }, {
    schema,
    tableName: 'planification_procedure_compatibilite',
    timestamps: false
  });

  const Habitat = sequelize.define('habitat', {
    id_habitat: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_project: { type: DataTypes.STRING, references: { model: Projet, key: 'id_projet' }, onDelete: 'CASCADE' },
    id_thematique: { type: DataTypes.INTEGER, references: { model: Thematique, key: 'id_thematique' } },
    commentaires: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE },
    created_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } },
    updated_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } }
  }, {
    schema,
    tableName: 'habitat',
    timestamps: false
  });

  const Gdv = sequelize.define('gdv', {
    id_gdv: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_project: { type: DataTypes.STRING, references: { model: Projet, key: 'id_projet' }, onDelete: 'CASCADE' },
    id_thematique: { type: DataTypes.INTEGER, references: { model: Thematique, key: 'id_thematique' } },
    conformite_id: { type: DataTypes.INTEGER, references: { model: ConformiteSdagdvEnum, key: 'id' } },
    commentaires: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE },
    created_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } },
    updated_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } }
  }, {
    schema,
    tableName: 'gdv',
    timestamps: false
  });

  const PoliceUrbanisme = sequelize.define('police_urbanisme', {
    id_police: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_project: { type: DataTypes.STRING, references: { model: Projet, key: 'id_projet' }, onDelete: 'CASCADE' },
    id_thematique: { type: DataTypes.INTEGER, references: { model: Thematique, key: 'id_thematique' } },
    commentaires: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE },
    created_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } },
    updated_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } }
  }, {
    schema,
    tableName: 'police_urbanisme',
    timestamps: false
  });

  // Associations pour AutorisationUrbanisme
  AutorisationUrbanisme.belongsTo(ProcedureEnum, {
    foreignKey: 'procedure_id',
    as: 'procedure_enum'
  });

  AutorisationUrbanisme.belongsTo(DecisionAutorisationEnum, {
    foreignKey: 'decision_id',
    as: 'decision_autorisation_enum'
  });

// Associations pour Planification
  Planification.belongsTo(DocumentUrbanismeEnum, {
    foreignKey: 'document_id',
    as: 'document_urbanisme_enum'
  });

  Planification.belongsTo(AvancementProcedureEnum, {
    foreignKey: 'avancement_id',
    as: 'avancement_procedure_enum'
  });

// Association many-to-many pour procedure_compatibilite
  Planification.belongsToMany(ProcedureCompatibiliteEnum, {
    through: PlanificationProcedureCompatibilite,
    foreignKey: 'id_planification',
    otherKey: 'id_procedure_compatibilite',
    as: 'procedure_compatibilite_enum'
  });

// Associations pour Gdv
  Gdv.belongsTo(ConformiteSdagdvEnum, {
    foreignKey: 'conformite_id',
    as: 'conformite_sdagdv_enum'
  });

  // ==================== ASSOCIATIONS AVEC PROJET, THEMATIQUE ET USER ====================

  // ========== AUTORISATION URBANISME ==========

  AutorisationUrbanisme.belongsTo(Projet, {
    foreignKey: 'id_project',
    as: 'projet'
  });

  AutorisationUrbanisme.belongsTo(Thematique, {
    foreignKey: 'id_thematique',
    as: 'thematique'
  });

  AutorisationUrbanisme.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'createur'
  });

  AutorisationUrbanisme.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'modificateur'
  });

  // ========== PLANIFICATION ==========

  Planification.belongsTo(Projet, {
    foreignKey: 'id_project',
    as: 'projet'
  });

  Planification.belongsTo(Thematique, {
    foreignKey: 'id_thematique',
    as: 'thematique'
  });

  Planification.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'createur'
  });

  Planification.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'modificateur'
  });

  // ========== HABITAT ==========

  Habitat.belongsTo(Projet, {
    foreignKey: 'id_project',
    as: 'projet'
  });

  Habitat.belongsTo(Thematique, {
    foreignKey: 'id_thematique',
    as: 'thematique'
  });

  Habitat.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'createur'
  });

  Habitat.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'modificateur'
  });

  // ========== GDV ==========

  Gdv.belongsTo(Projet, {
    foreignKey: 'id_project',
    as: 'projet'
  });

  Gdv.belongsTo(Thematique, {
    foreignKey: 'id_thematique',
    as: 'thematique'
  });

  Gdv.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'createur'
  });

  Gdv.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'modificateur'
  });

  // ========== POLICE URBANISME ==========

  PoliceUrbanisme.belongsTo(Projet, {
    foreignKey: 'id_project',
    as: 'projet'
  });

  PoliceUrbanisme.belongsTo(Thematique, {
    foreignKey: 'id_thematique',
    as: 'thematique'
  });

  PoliceUrbanisme.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'createur'
  });

  PoliceUrbanisme.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'modificateur'
  });




  return {
    ProcedureEnum,
    DecisionAutorisationEnum,
    DocumentUrbanismeEnum,
    ProcedureCompatibiliteEnum,
    AvancementProcedureEnum,
    ConformiteSdagdvEnum,
    AutorisationUrbanisme,
    Planification,
    PlanificationProcedureCompatibilite,
    Habitat,
    Gdv,
    PoliceUrbanisme
  };
};
