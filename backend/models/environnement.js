// backend/models/environnement.js

module.exports = (sequelize, DataTypes, { Projet, Thematique, User }) => {
  const schema = 'environnement';

  // Tables ENUM
  const NecessiteDepEnum = sequelize.define('necessite_dep_enum', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    value: { type: DataTypes.TEXT, allowNull: false, unique: true }
  }, {
    schema,
    tableName: 'necessite_dep_enum',
    timestamps: false
  });

  const NecessiteDefrichementEnum = sequelize.define('necessite_defrichement_enum', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    value: { type: DataTypes.TEXT, allowNull: false, unique: true }
  }, {
    schema,
    tableName: 'necessite_defrichement_enum',
    timestamps: false
  });

  const RegimeEauEnum = sequelize.define('regime_eau_enum', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    value: { type: DataTypes.TEXT, allowNull: false, unique: true }
  }, {
    schema,
    tableName: 'regime_eau_enum',
    timestamps: false
  });

  const StatutEauEnum = sequelize.define('statut_eau_enum', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    value: { type: DataTypes.TEXT, allowNull: false, unique: true }
  }, {
    schema,
    tableName: 'statut_eau_enum',
    timestamps: false
  });

  const RegimeEvaluationEnvEnum = sequelize.define('regime_evaluation_env_enum', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    value: { type: DataTypes.TEXT, allowNull: false, unique: true }
  }, {
    schema,
    tableName: 'regime_evaluation_env_enum',
    timestamps: false
  });

  // Tables métier
  const DerogationEspeceProtegee = sequelize.define('derogation_espece_protegee', {
    id_derogation: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_project: { type: DataTypes.STRING, allowNull: false, references: { model: Projet, key: 'id_projet' }, onDelete: 'CASCADE' },
    id_thematique: { type: DataTypes.INTEGER, allowNull: false, references: { model: Thematique, key: 'id_thematique' }, onDelete: 'CASCADE' },
    espece_protegee: { type: DataTypes.TEXT, allowNull: false },
    necessite_dep_id: { type: DataTypes.INTEGER, references: { model: NecessiteDepEnum, key: 'id' } },
    numero_dossier: { type: DataTypes.TEXT, unique: true },
    date_depot: { type: DataTypes.DATE },
    decision: { type: DataTypes.TEXT },
    date_decision: { type: DataTypes.DATE },
    commentaires: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE },
    created_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } },
    updated_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } }
  }, {
    schema,
    tableName: 'derogation_espece_protegee',
    timestamps: false
  });

  const Defrichement = sequelize.define('defrichement', {
    id_defrichement: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_project: { type: DataTypes.STRING, allowNull: false, references: { model: Projet, key: 'id_projet' }, onDelete: 'CASCADE' },
    id_thematique: { type: DataTypes.INTEGER, allowNull: false, references: { model: Thematique, key: 'id_thematique' }, onDelete: 'CASCADE' },
    surface_impactee: { type: DataTypes.TEXT, allowNull: false },
    necessite_autorisation_id: { type: DataTypes.INTEGER, references: { model: NecessiteDefrichementEnum, key: 'id' } },
    numero_dossier: { type: DataTypes.TEXT, unique: true },
    date_depot: { type: DataTypes.DATE },
    decision: { type: DataTypes.TEXT },
    date_decision: { type: DataTypes.DATE },
    commentaires: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE },
    created_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } },
    updated_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } }
  }, {
    schema,
    tableName: 'defrichement',
    timestamps: false
  });

  const LoiSurLeau = sequelize.define('loi_sur_leau', {
    id_loi_eau: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_project: { type: DataTypes.STRING, allowNull: false, references: { model: Projet, key: 'id_projet' }, onDelete: 'CASCADE' },
    id_thematique: { type: DataTypes.INTEGER, allowNull: false, references: { model: Thematique, key: 'id_thematique' }, onDelete: 'CASCADE' },
    rubrique_eau: { type: DataTypes.TEXT, allowNull: false },
    regime_id: { type: DataTypes.INTEGER, references: { model: RegimeEauEnum, key: 'id' } },
    numero_dossier: { type: DataTypes.TEXT, unique: true },
    statut_id: { type: DataTypes.INTEGER, references: { model: StatutEauEnum, key: 'id' } },
    date_depot: { type: DataTypes.DATE },
    decision: { type: DataTypes.TEXT },
    date_decision: { type: DataTypes.DATE },
    commentaires: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE },
    created_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } },
    updated_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } }
  }, {
    schema,
    tableName: 'loi_sur_leau',
    timestamps: false
  });

  const Assainissement = sequelize.define('assainissement', {
    id_assainissement: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_project: { type: DataTypes.STRING, allowNull: false, references: { model: Projet, key: 'id_projet' }, onDelete: 'CASCADE' },
    id_thematique: { type: DataTypes.INTEGER, allowNull: false, references: { model: Thematique, key: 'id_thematique' }, onDelete: 'CASCADE' },
    commentaires: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE },
    created_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } },
    updated_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } }
  }, {
    schema,
    tableName: 'assainissement',
    timestamps: false
  });

  const EvaluationEnvironnementale = sequelize.define('evaluation_environnementale', {
    id_evaluation: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_project: { type: DataTypes.STRING, allowNull: false, references: { model: Projet, key: 'id_projet' }, onDelete: 'CASCADE' },
    id_thematique: { type: DataTypes.INTEGER, allowNull: false, references: { model: Thematique, key: 'id_thematique' }, onDelete: 'CASCADE' },
    regime_id: { type: DataTypes.INTEGER, references: { model: RegimeEvaluationEnvEnum, key: 'id' } },
    rubriques_ee: { type: DataTypes.TEXT, allowNull: false },
    quelle_procedure_ee: { type: DataTypes.TEXT, allowNull: false },
    date_contrib_ddt_mrae: { type: DataTypes.DATE },
    avis_mrae: { type: DataTypes.TEXT },
    commentaires: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE },
    created_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } },
    updated_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } }
  }, {
    schema,
    tableName: 'evaluation_environnementale',
    timestamps: false
  });

// À la fin du fichier backend/models/environnement.js, avant le return

// ✅ ASSOCIATIONS POUR DEROGATION_ESPECE_PROTEGEE
  DerogationEspeceProtegee.belongsTo(NecessiteDepEnum, {
    foreignKey: 'necessite_dep_id',
    as: 'necessite_dep_enum'
  });

// ✅ ASSOCIATIONS POUR DEFRICHEMENT
  Defrichement.belongsTo(NecessiteDefrichementEnum, {
    foreignKey: 'necessite_autorisation_id',
    as: 'necessite_defrichement_enum'
  });

// ✅ ASSOCIATIONS POUR LOI_SUR_LEAU
  LoiSurLeau.belongsTo(RegimeEauEnum, {
    foreignKey: 'regime_id',
    as: 'regime_eau_enum'
  });

  LoiSurLeau.belongsTo(StatutEauEnum, {
    foreignKey: 'statut_id',
    as: 'statut_eau_enum'
  });

// ✅ ASSOCIATIONS POUR EVALUATION_ENVIRONNEMENTALE
  EvaluationEnvironnementale.belongsTo(RegimeEvaluationEnvEnum, {
    foreignKey: 'regime_id',
    as: 'regime_evaluation_env_enum'
  });

  // ==================== ASSOCIATIONS AVEC PROJET, THEMATIQUE ET USER ====================

// ========== DEROGATION ESPECE PROTEGEE ==========

  DerogationEspeceProtegee.belongsTo(Projet, {
    foreignKey: 'id_project',
    as: 'projet'
  });

  DerogationEspeceProtegee.belongsTo(Thematique, {
    foreignKey: 'id_thematique',
    as: 'thematique'
  });

  DerogationEspeceProtegee.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'createur'
  });

  DerogationEspeceProtegee.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'modificateur'
  });

  // ========== DEFRICHEMENT ==========

  Defrichement.belongsTo(Projet, {
    foreignKey: 'id_project',
    as: 'projet'
  });

  Defrichement.belongsTo(Thematique, {
    foreignKey: 'id_thematique',
    as: 'thematique'
  });

  Defrichement.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'createur'
  });

  Defrichement.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'modificateur'
  });

  // ========== LOI SUR L'EAU ==========

  LoiSurLeau.belongsTo(Projet, {
    foreignKey: 'id_project',
    as: 'projet'
  });

  LoiSurLeau.belongsTo(Thematique, {
    foreignKey: 'id_thematique',
    as: 'thematique'
  });

  LoiSurLeau.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'createur'
  });

  LoiSurLeau.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'modificateur'
  });

  // ========== ASSAINISSEMENT ==========

  Assainissement.belongsTo(Projet, {
    foreignKey: 'id_project',
    as: 'projet'
  });

  Assainissement.belongsTo(Thematique, {
    foreignKey: 'id_thematique',
    as: 'thematique'
  });

  Assainissement.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'createur'
  });

  Assainissement.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'modificateur'
  });

  // ========== EVALUATION ENVIRONNEMENTALE ==========

  EvaluationEnvironnementale.belongsTo(Projet, {
    foreignKey: 'id_project',
    as: 'projet'
  });

  EvaluationEnvironnementale.belongsTo(Thematique, {
    foreignKey: 'id_thematique',
    as: 'thematique'
  });

  EvaluationEnvironnementale.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'createur'
  });

  EvaluationEnvironnementale.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'modificateur'
  });


  return {
    NecessiteDepEnum,
    NecessiteDefrichementEnum,
    RegimeEauEnum,
    StatutEauEnum,
    RegimeEvaluationEnvEnum,
    DerogationEspeceProtegee,
    Defrichement,
    LoiSurLeau,
    Assainissement,
    EvaluationEnvironnementale
  };
};
