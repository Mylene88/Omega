// backend/models/autres.js

module.exports = (sequelize, DataTypes, { Projet, Thematique, User }) => {
  const schema = 'autres';

  // --- Enums ---

  const SoumisEnum = sequelize.define('soumis_enum', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    value: { type: DataTypes.TEXT, allowNull: false, unique: true }
  }, {
    schema,
    tableName: 'soumis_enum',
    timestamps: false
  });

  const AvisCdpenafEnum = sequelize.define('avis_cdpenaf_enum', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    value: { type: DataTypes.TEXT, allowNull: false, unique: true }
  }, {
    schema,
    tableName: 'avis_cdpenaf_enum',
    timestamps: false
  });

  const AvisPrefetEnum = sequelize.define('avis_prefet_enum', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    value: { type: DataTypes.TEXT, allowNull: false, unique: true }
  }, {
    schema,
    tableName: 'avis_prefet_enum',
    timestamps: false
  });

  const TypeParticipationEnum = sequelize.define('type_participation_enum', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    value: { type: DataTypes.TEXT, allowNull: false, unique: true }
  }, {
    schema,
    tableName: 'type_participation_enum',
    timestamps: false
  });

  const OrganisateurParticipationEnum = sequelize.define('organisateur_participation_enum', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    value: { type: DataTypes.TEXT, allowNull: false, unique: true }
  }, {
    schema,
    tableName: 'organisateur_participation_enum',
    timestamps: false
  });

  const AvisCommissaireEnqueteurEnum = sequelize.define('avis_commissaire_enqueteur_enum', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    value: { type: DataTypes.TEXT, allowNull: false, unique: true }
  }, {
    schema,
    tableName: 'avis_commissaire_enqueteur_enum',
    timestamps: false
  });

  const RegimeIcpeEnum = sequelize.define('regime_icpe_enum', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    value: { type: DataTypes.TEXT, allowNull: false, unique: true }
  }, {
    schema,
    tableName: 'regime_icpe_enum',
    timestamps: false
  });

  // --- Tables métier ---

  const CompensationAgricoleCollective = sequelize.define('compensation_agricole_collective', {
    id_compensation: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_project: { type: DataTypes.STRING, allowNull: false, references: { model: Projet, key: 'id_projet' }, onDelete: 'CASCADE' },
    id_thematique: { type: DataTypes.INTEGER, allowNull: false, references: { model: Thematique, key: 'id_thematique' }, onDelete: 'CASCADE' },
    soumis_id: { type: DataTypes.INTEGER, references: { model: SoumisEnum, key: 'id' } },
    avis_cdpenaf_id: { type: DataTypes.INTEGER, references: { model: AvisCdpenafEnum, key: 'id' } },
    avis_prefet_id: { type: DataTypes.INTEGER, references: { model: AvisPrefetEnum, key: 'id' } },
    montant: {
      type: DataTypes.NUMERIC,
      validate: { min: 0 }  // Montant positif
    },
    destinataire_compensation: { type: DataTypes.TEXT },
    commentaires: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE },
    created_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } },
    updated_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } }
  }, {
    schema,
    tableName: 'compensation_agricole_collective',
    timestamps: false
   });

  const ParticipationDuPublic = sequelize.define('participation_du_public', {
    id_participation: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_project: { type: DataTypes.STRING, allowNull: false, references: { model: Projet, key: 'id_projet' }, onDelete: 'CASCADE' },
    id_thematique: { type: DataTypes.INTEGER, allowNull: false, references: { model: Thematique, key: 'id_thematique' }, onDelete: 'CASCADE' },
    type_participation_id: { type: DataTypes.INTEGER, references: { model: TypeParticipationEnum, key: 'id' } },
    debut_participation_public: { type: DataTypes.DATE },
    fin_participation_public: { type: DataTypes.DATE },
    organisateur_participation_id: { type: DataTypes.INTEGER, references: { model: OrganisateurParticipationEnum, key: 'id' } },
    avis_commissaire_enqueteur_id: { type: DataTypes.INTEGER, references: { model: AvisCommissaireEnqueteurEnum, key: 'id' } },
    commentaires: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE },
    created_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } },
    updated_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } }
  }, {
      schema,
      tableName: 'participation_du_public',
      timestamps: false
  });

  const Icpe = sequelize.define('icpe', {
    id_icpe: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_project: { type: DataTypes.STRING, allowNull: false, references: { model: Projet, key: 'id_projet' }, onDelete: 'CASCADE' },
    id_thematique: { type: DataTypes.INTEGER, allowNull: false, references: { model: Thematique, key: 'id_thematique' }, onDelete: 'CASCADE' },
    regime_id: { type: DataTypes.INTEGER, references: { model: RegimeIcpeEnum, key: 'id' } },
    rubriques: { type: DataTypes.TEXT },
    decision: { type: DataTypes.TEXT },
    commentaires: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE },
    created_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } },
    updated_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } }
  }, {
      schema,
      tableName: 'icpe',
      timestamps: false
  });

  // À la fin du fichier backend/models/autres.js, avant le return

// ✅ ASSOCIATIONS POUR COMPENSATION_AGRICOLE_COLLECTIVE
  CompensationAgricoleCollective.belongsTo(SoumisEnum, {
    foreignKey: 'soumis_id',
    as: 'soumis_enum'
  });

  CompensationAgricoleCollective.belongsTo(AvisCdpenafEnum, {
    foreignKey: 'avis_cdpenaf_id',
    as: 'avis_cdpenaf_enum'
  });

  CompensationAgricoleCollective.belongsTo(AvisPrefetEnum, {
    foreignKey: 'avis_prefet_id',
    as: 'avis_prefet_enum'
  });

// ✅ ASSOCIATIONS POUR PARTICIPATION_DU_PUBLIC
  ParticipationDuPublic.belongsTo(TypeParticipationEnum, {
    foreignKey: 'type_participation_id',
    as: 'type_participation_enum'
  });

  ParticipationDuPublic.belongsTo(OrganisateurParticipationEnum, {
    foreignKey: 'organisateur_participation_id',
    as: 'organisateur_participation_enum'
  });

  ParticipationDuPublic.belongsTo(AvisCommissaireEnqueteurEnum, {
    foreignKey: 'avis_commissaire_enqueteur_id',
    as: 'avis_commissaire_enqueteur_enum'
  });

// ✅ ASSOCIATIONS POUR ICPE
  Icpe.belongsTo(RegimeIcpeEnum, {
    foreignKey: 'regime_id',
    as: 'regime_icpe_enum'
  });

  // ==================== ASSOCIATIONS AVEC PROJET, THEMATIQUE ET USER ====================

// ========== COMPENSATION AGRICOLE COLLECTIVE ==========

  CompensationAgricoleCollective.belongsTo(Projet, {
    foreignKey: 'id_project',
    as: 'projet'
  });

  CompensationAgricoleCollective.belongsTo(Thematique, {
    foreignKey: 'id_thematique',
    as: 'thematique'
  });

  CompensationAgricoleCollective.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'createur'
  });

  CompensationAgricoleCollective.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'modificateur'
  });

  // ========== PARTICIPATION DU PUBLIC ==========

  ParticipationDuPublic.belongsTo(Projet, {
    foreignKey: 'id_project',
    as: 'projet'
  });

  ParticipationDuPublic.belongsTo(Thematique, {
    foreignKey: 'id_thematique',
    as: 'thematique'
  });

  ParticipationDuPublic.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'createur'
  });

  ParticipationDuPublic.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'modificateur'
  });

  // ========== ICPE ==========

  Icpe.belongsTo(Projet, {
    foreignKey: 'id_project',
    as: 'projet'
  });

  Icpe.belongsTo(Thematique, {
    foreignKey: 'id_thematique',
    as: 'thematique'
  });

  Icpe.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'createur'
  });

  Icpe.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'modificateur'
  });


  return {
    SoumisEnum,
    AvisCdpenafEnum,
    AvisPrefetEnum,
    TypeParticipationEnum,
    OrganisateurParticipationEnum,
    AvisCommissaireEnqueteurEnum,
    RegimeIcpeEnum,
    CompensationAgricoleCollective,
    ParticipationDuPublic,
    Icpe,
  };
};
