// backend/models/principale.js


const defineExterneModels = require('./externe');

module.exports = (sequelize, DataTypes) => {
  const schema = 'principale';

  // Crée les modèles externes AVANT de les utiliser
  const { GeomCommune } = defineExterneModels(sequelize);

  // --- Définition des tables ENUM ---

  // Rôle des utilisateurs
  const RoleEnum = sequelize.define('role_enum', {
    id_role: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    libelle: { type: DataTypes.TEXT, allowNull: false }
  }, { schema, tableName: 'role_enum', timestamps: false });

  // Statut d'un projet
  const StatutProjetEnum = sequelize.define('statut_projet_enum', {
    id_statut: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    libelle: { type: DataTypes.TEXT, allowNull: false }
  }, { schema, tableName: 'statut_projet_enum', timestamps: false });

  // Services DDT associés
  const DdtServiceEnum = sequelize.define('ddt_service_enum', {
    id_service: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    libelle_service: { type: DataTypes.TEXT, allowNull: false }
  }, { schema, tableName: 'ddt_service_enum', timestamps: false });

  // Types de porteur de projet
  const TypePorteurEnum = sequelize.define('type_porteur_enum', {
    id_type_porteur: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    libelle: { type: DataTypes.TEXT, allowNull: false }
  }, { schema, tableName: 'type_porteur_enum', timestamps: false });

  // --- Table utilisateur ---
  const User = sequelize.define('user', {
    id_user: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.TEXT, unique: true, allowNull: false },
    password_hash: { type: DataTypes.TEXT, allowNull: false },
    first_login: { type: DataTypes.BOOLEAN, defaultValue: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    role_id: { type: DataTypes.INTEGER, references: { model: RoleEnum, key: 'id_role' } },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    prenom: { type: DataTypes.TEXT },
    nom: { type: DataTypes.TEXT }
  }, {
    schema,
    tableName: 'user',
    createdAt: 'created_at',
    updatedAt: false,
    timestamps: true
  });

  // --- Table projet ---
  const Projet = sequelize.define('projet', {
    id_projet: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
    },
    nom_projet: { type: DataTypes.TEXT, allowNull: false },
    description: { type: DataTypes.TEXT },
    statut_projet_id: { type: DataTypes.INTEGER, references: { model: StatutProjetEnum, key: 'id_statut' } },
    date_ident_projet: { type: DataTypes.DATE, allowNull: true },
    projet_signale: { type: DataTypes.BOOLEAN, defaultValue: false },
    charte_accueil: { type: DataTypes.BOOLEAN, defaultValue: false },
    demande_suppression: { type: DataTypes.BOOLEAN, defaultValue: false },
    demande_archivage: { type: DataTypes.BOOLEAN, defaultValue: false },
    demande_restauration: { type: DataTypes.BOOLEAN, defaultValue: false },
    is_archived: { type: DataTypes.BOOLEAN, defaultValue: false },
    archived_at: { type: DataTypes.DATE, allowNull: true },
    archived_by: { type: DataTypes.INTEGER, allowNull: true, references: { model: User, key: 'id_user' } },
    service_id: { type: DataTypes.INTEGER, references: { model: DdtServiceEnum, key: 'id_service' } },
    referent_ddt: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    created_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } },
    updated_at: { type: DataTypes.DATE },
    updated_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } }
  }, {
    schema,
    tableName: 'projet',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    paranoid: true  // Active le soft delete
  });

  // --- Porteur de projet ---
  const ProjetPorteur = sequelize.define('projet_porteur', {
    id_porteur: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_projet: { type:  DataTypes.STRING, references: { model: Projet, key: 'id_projet' }, onDelete: 'CASCADE' },
    type_porteur_id: { type: DataTypes.INTEGER, references: { model: TypePorteurEnum, key: 'id_type_porteur' } },
    autre_type_porteur: { type: DataTypes.TEXT },
    nom_structure: { type: DataTypes.TEXT, allowNull: false },
    referent_nom: { type: DataTypes.TEXT },
    referent_fonction: { type: DataTypes.TEXT },
    referent_email: { type: DataTypes.TEXT },
    referent_tel: { type: DataTypes.TEXT }
  }, {
    schema,
    tableName: 'projet_porteur',
    timestamps: false
  });

    // --- Fil d'actualité projet ---
  const ProjetSuivi = sequelize.define('projet_suivi', {
    id_suivi: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_projet: { type: DataTypes.STRING, references: { model: Projet, key: 'id_projet' }, onDelete: 'CASCADE' },
    suivi: { type: DataTypes.TEXT, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    created_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } }
  }, {
    schema,
    tableName: 'projet_suivi',
    createdAt: 'created_at',
    updatedAt: false,
    timestamps: true
  });


  // --- Thématique ---
  const Thematique = sequelize.define('thematique', {
    id_thematique: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    libelle: { type: DataTypes.TEXT, allowNull: false },
    modele: { type: DataTypes.TEXT }
  }, {
    schema,
    tableName: 'thematique',
    timestamps: false
  });

  // --- Table de liaison N-N Projet <-> Thématique ---
  const ProjetInThematique = sequelize.define('projet_in_thematique', {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true,
      comment: 'Identifiant unique permettant plusieurs instances de la même thématique pour un projet'
    },
    id_projet: { 
      type: DataTypes.STRING, 
      references: { model: Projet, key: 'id_projet' }, 
      onDelete: 'CASCADE',
      allowNull: false
    },
    id_thematique: { 
      type: DataTypes.INTEGER, 
      references: { model: Thematique, key: 'id_thematique' }, 
      onDelete: 'CASCADE',
      allowNull: false
    },
    date_ajout: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    ajoute_par: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } }
  }, {
    schema,
    tableName: 'projet_in_thematique',
    timestamps: false,
    // Ajout d'un index composé non unique pour optimiser les performances
    indexes: [
      {
        fields: ['id_projet', 'id_thematique'],
        name: 'idx_projet_thematique'
      }
    ]
  });

  // --- Documents liés aux projets ---
  const Document = sequelize.define('document', {
    id_document: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_projet: { type: DataTypes.STRING, references: { model: Projet, key: 'id_projet' }, onDelete: 'CASCADE' },
    lien_local: { type: DataTypes.TEXT },
    lien_web: { type: DataTypes.TEXT }
  }, {
    schema,
    tableName: 'document',
    timestamps: false
  });

  // --- Géométrie projet (spatial) ---
  const ProjetGeometry = sequelize.define('projet_geometry', {
    id_geom: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_projet: { type: DataTypes.STRING, references: { model: Projet, key: 'id_projet' }, onDelete: 'CASCADE' },
    geom: { type: DataTypes.GEOMETRY },
    geom_type: { type: DataTypes.TEXT },
    area_m2: { type: DataTypes.NUMERIC },
    length_m: { type: DataTypes.NUMERIC },
    communes_traversees: { type: DataTypes.ARRAY(DataTypes.TEXT) },
    codes_insee: { type: DataTypes.ARRAY(DataTypes.TEXT) },
    epci: { type: DataTypes.ARRAY(DataTypes.TEXT) },
    arrondissements: { type: DataTypes.ARRAY(DataTypes.TEXT) },
    deputes: { type: DataTypes.ARRAY(DataTypes.TEXT) },
    maires: { type: DataTypes.ARRAY(DataTypes.TEXT) }
  }, {
    schema,
    tableName: 'projet_geometry',
    timestamps: false
  });

  // --- Liaison projet - géométrie - commune ---
  const ProjetGeometryCommune = sequelize.define('projet_geometry_commune', {
    id_geom: { type: DataTypes.INTEGER, references: { model: ProjetGeometry, key: 'id_geom' }, onDelete: 'CASCADE', primaryKey: true },
    id_projet: { type: DataTypes.STRING, references: { model: Projet, key: 'id_projet' }, onDelete: 'CASCADE', primaryKey: true },
    id_commune: { type: DataTypes.INTEGER, primaryKey: true }
  }, {
    schema,
    tableName: 'projet_geometry_commune',
    timestamps: false
  });


  // --- Associations between models ---
  User.belongsTo(RoleEnum, { foreignKey: 'role_id', as: 'role_enum' });
  RoleEnum.hasMany(User, { foreignKey: 'role_id', as: 'users' });
  StatutProjetEnum.hasMany(Projet, { foreignKey: 'statut_projet_id'});
  Projet.belongsTo(StatutProjetEnum, { foreignKey: 'statut_projet_id', as: 'statut_projet_enum' });
  Projet.hasOne(ProjetGeometry, { foreignKey: 'id_projet', as: 'geometry'})
  Projet.belongsTo(DdtServiceEnum, { foreignKey: 'service_id', as: 'ddt_service_enum' });
  Projet.belongsTo(User, { as: 'creator', foreignKey: 'created_by' });
  Projet.belongsTo(User, { as: 'updater', foreignKey: 'updated_by' });
  Projet.belongsTo(User, { as: 'archiver', foreignKey: 'archived_by' });
  Projet.belongsTo(User, { foreignKey: 'created_by', as: 'createur' });
  ProjetPorteur.belongsTo(Projet, { foreignKey: 'id_projet', onDelete: 'CASCADE' });
  ProjetPorteur.belongsTo(TypePorteurEnum, { foreignKey: 'type_porteur_id', as: 'type_porteur_enum' });
  ProjetSuivi.belongsTo(Projet, { foreignKey: 'id_projet', onDelete: 'CASCADE' });
  ProjetSuivi.belongsTo(User, { foreignKey: 'created_by' });
  ProjetSuivi.belongsTo(User, { foreignKey: 'created_by', as: 'auteur' });

  Projet.hasMany(ProjetPorteur, { foreignKey: 'id_projet', as: 'porteurs' });
  Projet.hasMany(ProjetSuivi, { foreignKey: 'id_projet', as: 'suivis'});
  Projet.hasMany(Document, { foreignKey: 'id_projet', as: 'documents'})
  Projet.hasMany(ProjetInThematique, { foreignKey: 'id_projet', as: 'projet_in_thematiques'})

  User.hasMany(Projet, { foreignKey: 'created_by' });
  User.hasMany(ProjetSuivi, { foreignKey: 'created_by' });
  User.hasMany(Projet, { foreignKey: 'archived_by', as: 'archived_projects' });

  ProjetInThematique.belongsTo(Projet, { foreignKey: 'id_projet', onDelete: 'CASCADE'});
  ProjetInThematique.belongsTo(Thematique, { foreignKey: 'id_thematique', onDelete: 'CASCADE' });
  ProjetInThematique.belongsTo(User, { foreignKey: 'ajoute_par', as: 'ajouteParUser' });

  Projet.belongsToMany(Thematique, {
    through: ProjetInThematique,
    foreignKey: 'id_projet',
    otherKey: 'id_thematique',
    as: 'thematiques'
  });
  Thematique.belongsToMany(Projet, {
    through: ProjetInThematique,
    foreignKey: 'id_thematique',
    otherKey: 'id_projet'
  });

  Document.belongsTo(Projet, { foreignKey: 'id_projet', onDelete: 'CASCADE' });
  Thematique.hasMany(ProjetInThematique, { foreignKey: 'id_thematique', as: 'projet_in_thematiques' });

  ProjetGeometry.belongsTo(Projet, {
    foreignKey: 'id_projet',
    onDelete: 'CASCADE'
  });

  ProjetGeometry.hasMany(ProjetGeometryCommune, {
    foreignKey: 'id_geom',
    as: 'projet_geometry_communes',
    onDelete: 'CASCADE'
  });

  ProjetGeometryCommune.belongsTo(ProjetGeometry, {
    foreignKey: 'id_geom',
    onDelete: 'CASCADE'
  });

  ProjetGeometryCommune.belongsTo(Projet, {
    foreignKey: 'id_projet',
    onDelete: 'CASCADE'
  });

  ProjetGeometryCommune.belongsTo(GeomCommune, {
    foreignKey: 'id_commune',
    as: 'geom_commune',
    onDelete: 'CASCADE'
  });

  // --- Table audit_log : historique de toutes les modifications ---
  const AuditLog = sequelize.define('audit_log', {
    id_audit: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    table_name: { type: DataTypes.TEXT, allowNull: false },
    record_id: { type: DataTypes.TEXT, allowNull: false },
    action: { type: DataTypes.ENUM('CREATE', 'UPDATE', 'DELETE', 'RESTORE'), allowNull: false },
    old_values: { type: DataTypes.JSONB },
    new_values: { type: DataTypes.JSONB },
    changed_fields: { type: DataTypes.ARRAY(DataTypes.TEXT) },
    user_id: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } },
    user_ip: { type: DataTypes.TEXT },
    user_agent: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    schema,
    tableName: 'audit_log',
    createdAt: 'created_at',
    updatedAt: false,
    timestamps: true
  });

  // --- Table projet_snapshot : snapshots complets des projets ---
  const ProjetSnapshot = sequelize.define('projet_snapshot', {
    id_snapshot: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_projet: { type: DataTypes.STRING, references: { model: Projet, key: 'id_projet' }, onDelete: 'CASCADE' },
    user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'id_user' }, onDelete: 'CASCADE' },
    version_number: { type: DataTypes.INTEGER, allowNull: false }, // 1 à 10
    snapshot_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    is_current: { type: DataTypes.BOOLEAN, defaultValue: false }, // Dernière version
    description: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    schema,
    tableName: 'projet_snapshot',
    createdAt: 'created_at',
    updatedAt: false,
    timestamps: true,
    indexes: [
      { fields: ['id_projet'] },
      { fields: ['user_id'] },
      { fields: ['snapshot_date'] },
      { fields: ['id_projet', 'user_id', 'version_number'], unique: true }
    ]
  });

  // --- Table projet_snapshot_section : sections par snapshot (versioning granulaire) ---
  const ProjetSnapshotSection = sequelize.define('projet_snapshot_section', {
    id_section: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_snapshot: { type: DataTypes.INTEGER, allowNull: false, references: { model: ProjetSnapshot, key: 'id_snapshot' }, onDelete: 'CASCADE' },
    section_name: {
      type: DataTypes.ENUM('projet_info', 'porteurs', 'suivis', 'thematiques', 'documents', 'geometrie'),
      allowNull: false
    },
    section_data: { type: DataTypes.JSONB, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    schema,
    tableName: 'projet_snapshot_section',
    createdAt: 'created_at',
    updatedAt: false,
    timestamps: true,
    indexes: [
      { fields: ['id_snapshot'] },
      { fields: ['section_name'] },
      { fields: ['id_snapshot', 'section_name'], unique: true }
    ]
  });

  // --- Table admin_access_log : journalisation des accès admin ---
  const AdminAccessLog = sequelize.define('admin_access_log', {
    id_access: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'id_user' }, onDelete: 'CASCADE' },
    action: { type: DataTypes.STRING(100), allowNull: false },
    resource: { type: DataTypes.STRING(255) },
    resource_id: { type: DataTypes.STRING(255) },
    ip_address: { type: DataTypes.STRING(50) },
    user_agent: { type: DataTypes.TEXT },
    success: { type: DataTypes.BOOLEAN, defaultValue: true },
    error_message: { type: DataTypes.TEXT },
    duration_ms: { type: DataTypes.INTEGER },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    schema,
    tableName: 'admin_access_log',
    createdAt: 'created_at',
    updatedAt: false,
    timestamps: true
  });

  // --- Table projet_deletion_request : demandes de suppression ---
  const ProjetDeletionRequest = sequelize.define('projet_deletion_request', {
    id_deletion_request: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_projet: { type: DataTypes.STRING, allowNull: true, references: { model: Projet, key: 'id_projet' }, onDelete: 'SET NULL' },
    projet_nom_cache: { type: DataTypes.STRING, allowNull: true },
    requested_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'id_user' } },
    raison: { type: DataTypes.TEXT, allowNull: false },
    statut: { type: DataTypes.ENUM('en attente', 'accepter', 'refuser'), allowNull: false, defaultValue: 'en attente' },
    reviewed_by: { type: DataTypes.INTEGER, allowNull: true, references: { model: User, key: 'id_user' } },
    review_comment: { type: DataTypes.TEXT, allowNull: true },
    reviewed_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    schema,
    tableName: 'projet_deletion_request',
    createdAt: 'created_at',
    updatedAt: false,
    timestamps: true
  });

  // --- Table projet_archive_request : demandes d'archivage/restauration ---
  const ProjetArchiveRequest = sequelize.define('projet_archive_request', {
    id_archive_request: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_projet: { type: DataTypes.STRING, allowNull: true, references: { model: Projet, key: 'id_projet' }, onDelete: 'SET NULL' },
    projet_nom_cache: { type: DataTypes.STRING, allowNull: true },
    requested_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'id_user' } },
    request_type: {
      type: DataTypes.ENUM('archivage', 'restauration'),
      allowNull: false,
      defaultValue: 'archivage'
    },
    raison: { type: DataTypes.TEXT, allowNull: true },
    statut: { type: DataTypes.ENUM('en attente', 'accepter', 'refuser'), allowNull: false, defaultValue: 'en attente' },
    reviewed_by: { type: DataTypes.INTEGER, allowNull: true, references: { model: User, key: 'id_user' } },
    review_comment: { type: DataTypes.TEXT, allowNull: true },
    reviewed_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    schema,
    tableName: 'projet_archive_request',
    createdAt: 'created_at',
    updatedAt: false,
    timestamps: true
  });

  // Associations pour les tables d'audit
  AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  User.hasMany(AuditLog, { foreignKey: 'user_id' });

  AdminAccessLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  User.hasMany(AdminAccessLog, { foreignKey: 'user_id' });

  // Associations pour ProjetSnapshot
  ProjetSnapshot.belongsTo(Projet, { foreignKey: 'id_projet', onDelete: 'CASCADE', as: 'projet' });
  ProjetSnapshot.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  Projet.hasMany(ProjetSnapshot, { foreignKey: 'id_projet', as: 'snapshots' });
  User.hasMany(ProjetSnapshot, { foreignKey: 'user_id', as: 'snapshots' });

  // Associations pour ProjetSnapshotSection
  ProjetSnapshotSection.belongsTo(ProjetSnapshot, { foreignKey: 'id_snapshot', onDelete: 'CASCADE', as: 'snapshot' });
  ProjetSnapshot.hasMany(ProjetSnapshotSection, { foreignKey: 'id_snapshot', as: 'sections' });

  // Associations pour les demandes de suppression
  ProjetDeletionRequest.belongsTo(Projet, { foreignKey: 'id_projet', as: 'projet' });
  ProjetDeletionRequest.belongsTo(User, { foreignKey: 'requested_by', as: 'requestor' });
  ProjetDeletionRequest.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });
  Projet.hasMany(ProjetDeletionRequest, { foreignKey: 'id_projet', as: 'deletion_requests' });
  User.hasMany(ProjetDeletionRequest, { foreignKey: 'requested_by', as: 'deletion_requests_made' });
  User.hasMany(ProjetDeletionRequest, { foreignKey: 'reviewed_by', as: 'deletion_requests_reviewed' });

  // Associations pour les demandes d'archivage/restauration
  ProjetArchiveRequest.belongsTo(Projet, { foreignKey: 'id_projet', as: 'projet' });
  ProjetArchiveRequest.belongsTo(User, { foreignKey: 'requested_by', as: 'requestor' });
  ProjetArchiveRequest.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });
  Projet.hasMany(ProjetArchiveRequest, { foreignKey: 'id_projet', as: 'archive_requests' });
  User.hasMany(ProjetArchiveRequest, { foreignKey: 'requested_by', as: 'archive_requests_made' });
  User.hasMany(ProjetArchiveRequest, { foreignKey: 'reviewed_by', as: 'archive_requests_reviewed' });

  // --- Table section_version : versioning granulaire par section ---
  const SectionVersion = sequelize.define('section_version', {
    id_version: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_projet: { type: DataTypes.STRING, allowNull: false, references: { model: Projet, key: 'id_projet' }, onDelete: 'CASCADE' },
    user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'id_user' }, onDelete: 'CASCADE' },
    section_name: {
      type: DataTypes.ENUM('projet_info', 'porteurs', 'suivis', 'thematiques', 'documents', 'geometrie'),
      allowNull: false
    },
    version_number: { type: DataTypes.INTEGER, allowNull: false }, // 1 à 10
    section_data: { type: DataTypes.JSONB, allowNull: false },
    snapshot_date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    is_current: { type: DataTypes.BOOLEAN, defaultValue: false },
    description: { type: DataTypes.TEXT },
    metadata: { type: DataTypes.JSONB },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    schema,
    tableName: 'section_version',
    createdAt: 'created_at',
    updatedAt: false,
    timestamps: true,
    indexes: [
      { fields: ['id_projet', 'section_name', 'user_id'] },
      { fields: ['user_id', 'section_name'] },
      { fields: ['snapshot_date'] },
      { fields: ['id_projet', 'user_id', 'section_name', 'version_number'], unique: true }
    ]
  });

  // Associations pour les versions de sections
  SectionVersion.belongsTo(Projet, { foreignKey: 'id_projet', as: 'projet' });
  SectionVersion.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  Projet.hasMany(SectionVersion, { foreignKey: 'id_projet', as: 'section_versions' });
  User.hasMany(SectionVersion, { foreignKey: 'user_id', as: 'section_versions' });


  // --- Table des logs de sécurité (ANSSI conformité) ---
  const SecurityLog = sequelize.define('security_log', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    event_type: { type: DataTypes.STRING(50), allowNull: false },
    severity: { type: DataTypes.STRING(20), allowNull: false }, // INFO, WARNING, ERROR, CRITICAL
    user_id: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } },
    username: { type: DataTypes.STRING(255) },
    ip_address: { type: DataTypes.STRING(45) }, // Support IPv4 et IPv6
    user_agent: { type: DataTypes.TEXT },
    resource: { type: DataTypes.STRING(255) }, // Ressource accédée
    action: { type: DataTypes.STRING(50) }, // Action effectuée
    status: { type: DataTypes.STRING(20) }, // SUCCESS, FAILURE
    details: { type: DataTypes.JSONB }, // Détails additionnels
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    schema,
    tableName: 'security_log',
    timestamps: false,
    indexes: [
      { fields: ['event_type'] },
      { fields: ['user_id'] },
      { fields: ['timestamp'] },
      { fields: ['severity'] },
      { fields: ['ip_address'] }
    ]
  });

  // Association avec User
  SecurityLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Return all models as an object
  return {
    RoleEnum,
    StatutProjetEnum,
    DdtServiceEnum,
    TypePorteurEnum,
    User,
    Projet,
    ProjetPorteur,
    ProjetSuivi,
    Thematique,
    ProjetInThematique,
    Document,
    ProjetGeometry,
    ProjetGeometryCommune,
    AuditLog,
    ProjetSnapshot,
    ProjetSnapshotSection,
    AdminAccessLog,
    ProjetDeletionRequest,
    ProjetArchiveRequest,
    SectionVersion,
    SecurityLog,
  };
};
