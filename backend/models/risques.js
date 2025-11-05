// backend/models/risques.js

module.exports = (sequelize, DataTypes, { Projet, Thematique, User }) => {
  const schema = 'risques';

  const Ruissellement = sequelize.define('ruissellement', {
    id_ruissellement: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_project: { type: DataTypes.STRING, references: { model: Projet, key: 'id_projet' }, onDelete: 'CASCADE' },
    id_thematique: { type: DataTypes.INTEGER, references: { model: Thematique, key: 'id_thematique' } },
    commentaires: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE },
    created_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } },
    updated_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } }
  }, {
    schema,
    tableName: 'ruissellement',
    timestamps: false
  });

  const Bruit = sequelize.define('bruit', {
    id_bruit: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_project: { type: DataTypes.STRING, references: { model: Projet, key: 'id_projet' }, onDelete: 'CASCADE' },
    id_thematique: { type: DataTypes.INTEGER, references: { model: Thematique, key: 'id_thematique' } },
    commentaires: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE },
    created_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } },
    updated_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } }
  }, {
    schema,
    tableName: 'bruit',
    timestamps: false
  });

  const Zonesinondables = sequelize.define('zonesinond', {
    id_zonesinond: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_project: { type: DataTypes.STRING, references: { model: Projet, key: 'id_projet' }, onDelete: 'CASCADE' },
    id_thematique: { type: DataTypes.INTEGER, references: { model: Thematique, key: 'id_thematique' } },
    commentaires: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE },
    created_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } },
    updated_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } }
  }, {
    schema,
    tableName: 'zonesinond',
    timestamps: false
  });

  const Cavites = sequelize.define('cavites', {
    id_cavites: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_project: { type: DataTypes.STRING, references: { model: Projet, key: 'id_projet' }, onDelete: 'CASCADE' },
    id_thematique: { type: DataTypes.INTEGER, references: { model: Thematique, key: 'id_thematique' } },
    commentaires: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE },
    created_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } },
    updated_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } }
  }, {
    schema,
    tableName: 'cavites',
    timestamps: false
  });

  const Incendie = sequelize.define('incendie', {
    id_incendie: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_project: { type: DataTypes.STRING, references: { model: Projet, key: 'id_projet' }, onDelete: 'CASCADE' },
    id_thematique: { type: DataTypes.INTEGER, references: { model: Thematique, key: 'id_thematique' } },
    commentaires: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE },
    created_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } },
    updated_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } }
  }, {
    schema,
    tableName: 'incendie',
    timestamps: false
  });

  const Rga = sequelize.define('rga', {
    id_rga: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_project: { type: DataTypes.STRING, references: { model: Projet, key: 'id_projet' }, onDelete: 'CASCADE' },
    id_thematique: { type: DataTypes.INTEGER, references: { model: Thematique, key: 'id_thematique' } },
    commentaires: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE },
    created_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } },
    updated_by: { type: DataTypes.INTEGER, references: { model: User, key: 'id_user' } }
  }, {
    schema,
    tableName: 'rga',
    timestamps: false
  });

  // ==================== ASSOCIATIONS ====================

  // ========== RUISSELLEMENT ==========

  Ruissellement.belongsTo(Projet, {
    foreignKey: 'id_project',
    as: 'projet'
  });

  Ruissellement.belongsTo(Thematique, {
    foreignKey: 'id_thematique',
    as: 'thematique'
  });

  Ruissellement.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'createur'
  });

  Ruissellement.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'modificateur'
  });

  // ========== BRUIT ==========

  Bruit.belongsTo(Projet, {
    foreignKey: 'id_project',
    as: 'projet'
  });

  Bruit.belongsTo(Thematique, {
    foreignKey: 'id_thematique',
    as: 'thematique'
  });

  Bruit.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'createur'
  });

  Bruit.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'modificateur'
  });

  // ========== ZONES INONDABLES ==========

  Zonesinondables.belongsTo(Projet, {
    foreignKey: 'id_project',
    as: 'projet'
  });

  Zonesinondables.belongsTo(Thematique, {
    foreignKey: 'id_thematique',
    as: 'thematique'
  });

  Zonesinondables.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'createur'
  });

  Zonesinondables.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'modificateur'
  });

  // ========== CAVITES ==========

  Cavites.belongsTo(Projet, {
    foreignKey: 'id_project',
    as: 'projet'
  });

  Cavites.belongsTo(Thematique, {
    foreignKey: 'id_thematique',
    as: 'thematique'
  });

  Cavites.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'createur'
  });

  Cavites.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'modificateur'
  });

  // ========== INCENDIE ==========

  Incendie.belongsTo(Projet, {
    foreignKey: 'id_project',
    as: 'projet'
  });

  Incendie.belongsTo(Thematique, {
    foreignKey: 'id_thematique',
    as: 'thematique'
  });

  Incendie.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'createur'
  });

  Incendie.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'modificateur'
  });

  // ========== RGA ==========

  Rga.belongsTo(Projet, {
    foreignKey: 'id_project',
    as: 'projet'
  });

  Rga.belongsTo(Thematique, {
    foreignKey: 'id_thematique',
    as: 'thematique'
  });

  Rga.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'createur'
  });

  Rga.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'modificateur'
  });



  return {
    Ruissellement,
    Bruit,
    Rga,
    Incendie,
    Zonesinondables,
    Cavites
  };
};
