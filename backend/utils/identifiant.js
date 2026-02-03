// backend/utils/identifiant.js

const models = require('../models');
const Projet = models.Projet;

function generateRandomId(length = 5) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function generateUniqueProjectId(length = 5) {
    let unique = false;
    let code;

    while (!unique) {
        code = generateRandomId(length);
        const existingProject = await Projet.findByPk(code); // Vérifie unicité dans base
        if (!existingProject) unique = true;
    }

    return code;
}

module.exports = generateUniqueProjectId;
