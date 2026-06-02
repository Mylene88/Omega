import db from '../../../../../models';
import bcrypt from 'bcryptjs';
import { checkAdminAccess } from '../../../../../lib/adminAuthHelper';

const { User, RoleEnum, sequelize } = db;
const IMPORT_TEMP_PASSWORD = 'Omega-28!';

const normalizeUsername = (value) => String(value || '').trim().toLowerCase();

const normalizeImportedUsers = (users) => {
  const normalizedUsers = [];
  const duplicates = [];
  const seen = new Set();

  for (const rawUser of Array.isArray(users) ? users : []) {
    const username = String(rawUser?.username || '').trim();
    if (!username) continue;

    const normalized = normalizeUsername(username);
    if (seen.has(normalized)) {
      duplicates.push(username);
      continue;
    }

    seen.add(normalized);
    normalizedUsers.push({
      username,
      prenom: rawUser?.prenom ? String(rawUser.prenom).trim() : null,
      nom: rawUser?.nom ? String(rawUser.nom).trim() : null,
      role_id: rawUser?.role_id ? Number(rawUser.role_id) : null,
      role_libelle: rawUser?.role_libelle ? String(rawUser.role_libelle).trim() : null
    });
  }

  return { normalizedUsers, duplicates };
};

const buildRoleResolver = async () => {
  const roles = await RoleEnum.findAll({
    attributes: ['id_role', 'libelle']
  });

  const rolesById = new Map();
  const rolesByLabel = new Map();
  let defaultRoleId = null;
  let adminRoleId = null;

  roles.forEach((role) => {
    rolesById.set(role.id_role, role);
    rolesByLabel.set(String(role.libelle || '').trim().toLowerCase(), role);

    if (String(role.libelle || '').trim().toLowerCase() === 'utilisateur') {
      defaultRoleId = role.id_role;
    }

    if (String(role.libelle || '').trim().toLowerCase() === 'admin') {
      adminRoleId = role.id_role;
    }
  });

  return {
    resolveRoleId(importedUser) {
      if (importedUser.role_id && rolesById.has(importedUser.role_id)) {
        return importedUser.role_id;
      }

      if (importedUser.role_libelle) {
        const role = rolesByLabel.get(importedUser.role_libelle.toLowerCase());
        if (role) return role.id_role;
      }

      return defaultRoleId;
    },
    isAdminRole(roleId) {
      return roleId === adminRoleId;
    },
    formatRoleLabel(roleId) {
      return rolesById.get(roleId)?.libelle || 'N/A';
    }
  };
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const adminCheck = await checkAdminAccess(req);
    if (!adminCheck.isAdmin) {
      return res.status(403).json({
        success: false,
        message: adminCheck.error || 'Accès refusé. Droits administrateur requis.'
      });
    }

    const { users, preview = false, deactivateUserIds = [] } = req.body || {};
    const { normalizedUsers, duplicates } = normalizeImportedUsers(users);

    if (normalizedUsers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun utilisateur valide trouvé dans le fichier importé'
      });
    }

    const roleResolver = await buildRoleResolver();

    const existingUsers = await User.findAll({
      attributes: ['id_user', 'username', 'prenom', 'nom', 'is_active', 'role_id'],
      order: [['username', 'ASC']]
    });

    const existingByUsername = new Map(
      existingUsers.map((user) => [normalizeUsername(user.username), user])
    );

    const importedUsernames = new Set(normalizedUsers.map((user) => normalizeUsername(user.username)));

    const newUsers = [];
    const matchedUsers = [];
    const reactivatableUsers = [];
    const updatableUsers = [];

    for (const importedUser of normalizedUsers) {
      const existingUser = existingByUsername.get(normalizeUsername(importedUser.username));
      const importedRoleId = roleResolver.resolveRoleId(importedUser);

      if (!existingUser) {
        newUsers.push({
          ...importedUser,
          resolved_role_id: importedRoleId
        });
        continue;
      }

      const keepExistingAdminRole = roleResolver.isAdminRole(existingUser.role_id);
      const targetRoleId = keepExistingAdminRole ? existingUser.role_id : importedRoleId;
      const roleWillChange = !keepExistingAdminRole && importedRoleId && importedRoleId !== existingUser.role_id;

      const matched = {
        id_user: existingUser.id_user,
        username: existingUser.username,
        prenom: existingUser.prenom,
        nom: existingUser.nom,
        is_active: existingUser.is_active,
        role_id: existingUser.role_id,
        role_libelle: roleResolver.formatRoleLabel(existingUser.role_id),
        imported_role_id: importedRoleId,
        imported_role_libelle: roleResolver.formatRoleLabel(importedRoleId),
        target_role_id: targetRoleId,
        target_role_libelle: roleResolver.formatRoleLabel(targetRoleId),
        keep_existing_admin_role: keepExistingAdminRole,
        role_will_change: roleWillChange
      };

      matchedUsers.push(matched);

      if (existingUser.is_active === false) {
        reactivatableUsers.push(matched);
      }

      if (roleWillChange) {
        updatableUsers.push(matched);
      }
    }

    const deactivateCandidates = existingUsers
      .filter((user) => user.is_active !== false)
      .filter((user) => !importedUsernames.has(normalizeUsername(user.username)))
      .map((user) => ({
        id_user: user.id_user,
        username: user.username,
        nom_complet: `${user.prenom || ''} ${user.nom || ''}`.trim() || user.username,
        role_id: user.role_id,
        role_libelle: roleResolver.formatRoleLabel(user.role_id),
        can_deactivate: user.id_user !== adminCheck.userId
      }));

    if (preview) {
      return res.status(200).json({
        success: true,
        data: {
          summary: {
            importedCount: normalizedUsers.length,
            duplicateCount: duplicates.length,
            newCount: newUsers.length,
            existingCount: matchedUsers.length,
            updatedCount: updatableUsers.length,
            reactivatableCount: reactivatableUsers.length,
            deactivateCandidateCount: deactivateCandidates.filter((user) => user.can_deactivate).length
          },
          duplicates,
          newUsers: newUsers.map((user) => ({
            username: user.username,
            prenom: user.prenom,
            nom: user.nom,
            role_id: user.resolved_role_id,
            role_libelle: roleResolver.formatRoleLabel(user.resolved_role_id)
          })),
          matchedUsers,
          updatableUsers,
          reactivatableUsers,
          deactivateCandidates
        }
      });
    }

    const deactivateIdSet = new Set(
      (Array.isArray(deactivateUserIds) ? deactivateUserIds : [])
        .map((id) => Number(id))
        .filter(Number.isInteger)
    );

    const selectedDeactivationTargets = deactivateCandidates.filter(
      (user) => user.can_deactivate && deactivateIdSet.has(user.id_user)
    );

    const createdUsers = [];
    const reactivatedUsers = [];
    const updatedUsers = [];

    await sequelize.transaction(async (transaction) => {
      for (const newUser of newUsers) {
        const temporaryPassword = IMPORT_TEMP_PASSWORD;
        const password_hash = await bcrypt.hash(temporaryPassword, 10);

        const createdUser = await User.create({
          username: newUser.username,
          password_hash,
          prenom: newUser.prenom,
          nom: newUser.nom,
          role_id: newUser.resolved_role_id,
          first_login: true,
          is_active: true
        }, { transaction });

        createdUsers.push({
          id_user: createdUser.id_user,
          username: createdUser.username,
          prenom: createdUser.prenom,
          nom: createdUser.nom,
          role_id: createdUser.role_id,
          role_libelle: roleResolver.formatRoleLabel(createdUser.role_id),
          temporaryPassword
        });
      }

      const reactivatableIds = reactivatableUsers.map((user) => user.id_user);
      if (reactivatableIds.length > 0) {
        await User.update(
          { is_active: true },
          {
            where: { id_user: reactivatableIds },
            transaction
          }
        );
        reactivatedUsers.push(...reactivatableUsers);
      }

      for (const updatableUser of updatableUsers) {
        await User.update(
          { role_id: updatableUser.target_role_id },
          {
            where: { id_user: updatableUser.id_user },
            transaction
          }
        );
        updatedUsers.push(updatableUser);
      }

      if (selectedDeactivationTargets.length > 0) {
        await User.update(
          { is_active: false },
          {
            where: { id_user: selectedDeactivationTargets.map((user) => user.id_user) },
            transaction
          }
        );
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Import des utilisateurs effectué avec succès',
      data: {
        summary: {
          importedCount: normalizedUsers.length,
          duplicateCount: duplicates.length,
          createdCount: createdUsers.length,
          existingCount: matchedUsers.length,
          updatedCount: updatedUsers.length,
          reactivatedCount: reactivatedUsers.length,
          deactivatedCount: selectedDeactivationTargets.length
        },
        duplicates,
        createdUsers,
        updatedUsers,
        reactivatedUsers,
        deactivatedUsers: selectedDeactivationTargets,
        matchedUsers
      }
    });
  } catch (error) {
    console.error('Erreur POST /api/admin/users/import:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'import des utilisateurs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
