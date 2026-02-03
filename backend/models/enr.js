// backend/models/enr.js
// Modèles ENR + ENUMS + tables de jonction, alias cohérents avec les includes dynamiques.

module.exports = (sequelize, DataTypes, { Projet, Thematique, User }) => {
  const schema = 'enr';

  // ==================== ENUMS COMMUNS ====================
  const EtatAvancementEnum = sequelize.define('etat_avancement_enum', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    value: { type: DataTypes.TEXT, allowNull: false, unique: true }
  }, { schema, tableName: 'etat_avancement_enum', timestamps: false });

  const TypeInstallationEnum = sequelize.define('type_installation_enum', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    value: { type: DataTypes.TEXT, allowNull: false, unique: true }
  }, { schema, tableName: 'type_installation_enum', timestamps: false });

  const ProjetZoneAccEnum = sequelize.define('projet_zone_acc_enum', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    value: { type: DataTypes.TEXT, allowNull: false, unique: true }
  }, { schema, tableName: 'projet_zone_acc_enum', timestamps: false });

  const DocCadreEnum = sequelize.define('doc_cadre_enum', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    value: { type: DataTypes.TEXT, allowNull: false, unique: true }
  }, { schema, tableName: 'doc_cadre_enum', timestamps: false });

  const TypeSolEnum = sequelize.define('type_sol_enum', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    libelle: { type: DataTypes.TEXT, allowNull: false, unique: true }
  }, { schema, tableName: 'type_sol_enum', timestamps: false });

  const TypeMethaniseurEnum = sequelize.define('type_methaniseur_enum', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    value: { type: DataTypes.TEXT, allowNull: false, unique: true }
  }, { schema, tableName: 'type_methaniseur_enum', timestamps: false });

  const InstructeurIcpeEnum = sequelize.define('instructeur_icpe_enum', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    value: { type: DataTypes.TEXT, allowNull: false, unique: true }
  }, { schema, tableName: 'instructeur_icpe_enum', timestamps: false });

  const OrigineIntrantsEnum = sequelize.define('origine_intrants_enum', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    value: { type: DataTypes.TEXT, allowNull: false, unique: true }
  }, { schema, tableName: 'origine_intrants_enum', timestamps: false });

  // ✅ Définir RegimeIcpeEnumEnr pour le schema ENR (distinct de celui dans AUTRES)
  const RegimeIcpeEnumEnr = sequelize.define('regime_icpe_enum_enr', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    value: { type: DataTypes.TEXT, allowNull: false, unique: true }
  }, { schema, tableName: 'regime_icpe_enum', timestamps: false });

  // ==================== ENTITÉS ====================
  // EOLIEN (structure minimale d’après la capture: id_eolien, id_project, id_thematique, commentaires, created_at, updated_at, created_by, updated_by)
  const Eolien = sequelize.define('eolien', {
    id_eolien: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_project: { type: DataTypes.STRING },
    id_thematique: { type: DataTypes.INTEGER },
    commentaires: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: sequelize.literal('now()') },
    updated_at: { type: DataTypes.DATE },
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER }
  }, { schema, tableName: 'eolien', timestamps: false });

  // STOCKAGE BATTERIE
  const StockageBatterie = sequelize.define('stockage_batterie', {
    id_stockage_batterie: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_project: { type: DataTypes.STRING },
    id_thematique: { type: DataTypes.INTEGER },
    puissance_mw: { type: DataTypes.DECIMAL },
    surface_totale_ha: { type: DataTypes.DECIMAL },
    type_sol: { type: DataTypes.TEXT },
    etat_avancement_id: { type: DataTypes.INTEGER },
    commentaires: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: sequelize.literal('now()') },
    updated_at: { type: DataTypes.DATE },
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER }
  }, { schema, tableName: 'stockage_batterie', timestamps: false });

  // PV / AGRI-PV
  const PvAgriPv = sequelize.define('pv_agri_pv', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_project: { type: DataTypes.STRING },
    id_thematique: { type: DataTypes.INTEGER },
    type_installation_id: { type: DataTypes.INTEGER },
    zone_acceleration_id: { type: DataTypes.INTEGER },
    document_cadre_id: { type: DataTypes.INTEGER },
    puissance_mw: { type: DataTypes.DECIMAL },
    surface_totale_ha: { type: DataTypes.DECIMAL },
    raccordement: { type: DataTypes.TEXT },
    date_comite_projet: { type: DataTypes.DATE },
    etat_avancement_id: { type: DataTypes.INTEGER, defaultValue: 1 },
    commentaires: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: sequelize.literal('now()') },
    updated_at: { type: DataTypes.DATE },
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER }
  }, { schema, tableName: 'pv_agri_pv', timestamps: false }); 
  // METHANISATION
  const Methanisation = sequelize.define('methanisation', {
    id_methanisation: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_project: { type: DataTypes.STRING },
    id_thematique: { type: DataTypes.INTEGER },
    type_methaniseur_id: { type: DataTypes.INTEGER },
    instructeur_icpe_id: { type: DataTypes.INTEGER },
    etat_avancement_id: { type: DataTypes.INTEGER },
    commentaires: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: sequelize.literal('now()') },
    updated_at: { type: DataTypes.DATE },
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER }
  }, { schema, tableName: 'methanisation', timestamps: false }); 

  // ==================== TABLES DE JONCTION ====================
  const PvTypeSol = sequelize.define('pv_type_sol', {
    id_pv: { type: DataTypes.INTEGER, primaryKey: true },
    id_type_sol: { type: DataTypes.INTEGER, primaryKey: true }
  }, { schema, tableName: 'pv_type_sol', timestamps: false }); 

  const MethanisationOrigineIntrants = sequelize.define('methanisation_origine_intrants', {
    id_methanisation: { type: DataTypes.INTEGER, primaryKey: true },
    id_origine_intrants: { type: DataTypes.INTEGER, primaryKey: true }
  }, { schema, tableName: 'methanisation_origine_intrants', timestamps: false });

  const MethanisationRegimeIcpe = sequelize.define('methanisation_regime_icpe', {
    id_methanisation: { type: DataTypes.INTEGER, primaryKey: true },
    id_regime_icpe: { type: DataTypes.INTEGER, primaryKey: true }
  }, { schema, tableName: 'methanisation_regime_icpe', timestamps: false }); 

  // ==================== ASSOCIATIONS (alias EXACTS) ====================
  // Liens génériques
  const linkCommons = (Model, idField) => {
    Model.belongsTo(Projet, { as: 'projet', foreignKey: 'id_project', targetKey: 'id_projet' });
    Model.belongsTo(Thematique, { as: 'thematique', foreignKey: 'id_thematique', targetKey: 'id_thematique' });
    Model.belongsTo(User, { as: 'createur', foreignKey: 'created_by', targetKey: 'id_user' });
    Model.belongsTo(User, { as: 'modificateur', foreignKey: 'updated_by', targetKey: 'id_user' });
  };
  linkCommons(Eolien, 'id_eolien'); 
  linkCommons(StockageBatterie, 'id_stockage_batterie');
  linkCommons(PvAgriPv, 'id');
  linkCommons(Methanisation, 'id_methanisation');

  // Stockage_batterie -> état d’avancement
  StockageBatterie.belongsTo(EtatAvancementEnum, {
    as: 'etat_avancement_enum',
    foreignKey: 'etat_avancement_id',
    targetKey: 'id'
  }); 

  // PV belongsTo enums simples
  PvAgriPv.belongsTo(TypeInstallationEnum, { as: 'type_installation_enum', foreignKey: 'type_installation_id', targetKey: 'id' });
  PvAgriPv.belongsTo(ProjetZoneAccEnum, { as: 'projet_zone_acc_enum', foreignKey: 'zone_acceleration_id', targetKey: 'id' });
  PvAgriPv.belongsTo(DocCadreEnum, { as: 'doc_cadre_enum', foreignKey: 'document_cadre_id', targetKey: 'id' });
  PvAgriPv.belongsTo(EtatAvancementEnum, { as: 'etat_avancement_enum', foreignKey: 'etat_avancement_id', targetKey: 'id' }); 

  // PV <-> type_sol (M2M)
  PvAgriPv.belongsToMany(TypeSolEnum, {
    as: 'type_sol_enum',
    through: PvTypeSol,
    foreignKey: 'id_pv',
    otherKey: 'id_type_sol'
  });
  TypeSolEnum.belongsToMany(PvAgriPv, {
    as: 'pv_agri_pv',
    through: PvTypeSol,
    foreignKey: 'id_type_sol',
    otherKey: 'id_pv'
  }); 

  // Methanisation belongsTo enums simples
  Methanisation.belongsTo(TypeMethaniseurEnum, { as: 'type_methaniseur_enum', foreignKey: 'type_methaniseur_id', targetKey: 'id' });
  Methanisation.belongsTo(InstructeurIcpeEnum, { as: 'instructeur_icpe_enum', foreignKey: 'instructeur_icpe_id', targetKey: 'id' });
  Methanisation.belongsTo(EtatAvancementEnum, { as: 'etat_avancement_enum', foreignKey: 'etat_avancement_id', targetKey: 'id' });

  // Methanisation <-> origines intrants (M2M)
  Methanisation.belongsToMany(OrigineIntrantsEnum, {
    as: 'origine_intrants_enum',
    through: MethanisationOrigineIntrants,
    foreignKey: 'id_methanisation',
    otherKey: 'id_origine_intrants'
  });
  OrigineIntrantsEnum.belongsToMany(Methanisation, {
    as: 'methanisation',
    through: MethanisationOrigineIntrants,
    foreignKey: 'id_origine_intrants',
    otherKey: 'id_methanisation'
  });

  // Methanisation <-> régimes ICPE (M2M)
  Methanisation.belongsToMany(RegimeIcpeEnumEnr, {
    as: 'regime_icpe_enum',
    through: MethanisationRegimeIcpe,
    foreignKey: 'id_methanisation',
    otherKey: 'id_regime_icpe'
  });
  RegimeIcpeEnumEnr.belongsToMany(Methanisation, {
    as: 'methanisation',
    through: MethanisationRegimeIcpe,
    foreignKey: 'id_regime_icpe',
    otherKey: 'id_methanisation'
  }); 

  // ==================== EXPORT ====================
  return {
    // entités
    Eolien,
    StockageBatterie,
    PvAgriPv,
    Methanisation,
    // enums
    EtatAvancementEnum,
    TypeInstallationEnum,
    ProjetZoneAccEnum,
    DocCadreEnum,
    TypeSolEnum,
    TypeMethaniseurEnum,
    InstructeurIcpeEnum,
    OrigineIntrantsEnum,
    RegimeIcpeEnumEnr, // ✅ Modèle spécifique pour enr.regime_icpe_enum
    // jonctions exportées
    PvTypeSol,
    MethanisationOrigineIntrants,
    MethanisationRegimeIcpe
  };
};
