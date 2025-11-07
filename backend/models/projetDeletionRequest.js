// backend/models/projetDeletionRequest.js

module.exports = (sequelize, DataTypes) => {
  const ProjetDeletionRequest = sequelize.define(
    'ProjetDeletionRequest',
    {
      id_deletion_request: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      id_projet: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      requested_by: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      raison: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      statut: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending'
      },
      reviewed_by: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      review_comment: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: 'projet_deletion_request',
      schema: 'principale',
      timestamps: false
    }
  );

  ProjetDeletionRequest.associate = (models) => {
    // Relation avec Projet
    ProjetDeletionRequest.belongsTo(models.Projet, {
      foreignKey: 'id_projet',
      as: 'projet'
    });

    // Relation avec User (demandeur)
    ProjetDeletionRequest.belongsTo(models.User, {
      foreignKey: 'requested_by',
      as: 'requestor'
    });

    // Relation avec User (reviewer admin)
    ProjetDeletionRequest.belongsTo(models.User, {
      foreignKey: 'reviewed_by',
      as: 'reviewer'
    });
  };

  return ProjetDeletionRequest;
};
