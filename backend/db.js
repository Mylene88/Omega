// backend/db.js
const { Sequelize } = require('sequelize');
const sequelize = require('./config/database');

module.exports = sequelize;
module.exports.Sequelize = Sequelize;
module.exports.QueryTypes = Sequelize.QueryTypes;
