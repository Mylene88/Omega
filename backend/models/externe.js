// externe.js (CommonJS)
const { DataTypes } = require('sequelize');

const schema = 'externe';

module.exports = function defineExterneModels(sequelize) {
  const GeomCommune = sequelize.define('geom_commune', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nom_com: { type: DataTypes.STRING },
    code_dep: { type: DataTypes.STRING },
    code_insee: { type: DataTypes.STRING, allowNull: false },
    canton: { type: DataTypes.STRING },
    arrondisst: { type: DataTypes.STRING },
    popul: { type: DataTypes.INTEGER },
    code_epci: { type: DataTypes.STRING },
    nom_epci: { type: DataTypes.STRING },
    maire_prenom: { type: DataTypes.STRING },
    maire_nom: { type: DataTypes.STRING },
    num_arrond: { type: DataTypes.STRING },
    depute_prenom: { type: DataTypes.STRING },
    depute_nom: { type: DataTypes.STRING },
    geom: { type: DataTypes.GEOMETRY('MULTIPOLYGON', 4326) }
  }, {
    schema,
    timestamps: false,
    tableName: 'geom_commune'
  });

  return { GeomCommune };
};
