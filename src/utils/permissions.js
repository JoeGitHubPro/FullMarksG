// src/utils/permissions.js
//
// Mirrors fullmarks-backend/utils/adminPermissions.js purely to hide UI
// actions a sub admin isn't allowed to use. This is NOT the real
// enforcement — the backend rejects these actions independently even if a
// button were shown by mistake — it just keeps the UI honest about what
// will actually work.
//
// A sub admin has full admin access EXCEPT:
//   - cannot manage access codes
//   - cannot delete courses
//   - cannot delete student/parent/instructor/admin accounts
//     (deleting an assistant account is NOT restricted)
//   - cannot create/edit/deactivate/reset-password on any OTHER admin account
//   - cannot change anyone's super_admin/is_sub_admin level, including their
//     own

export const isSubAdmin = (user) =>
  !!(user && user.role === "admin" && user.isSubAdmin);

// Roles a sub admin is never allowed to permanently delete. Assistants are
// deliberately left out — a sub admin may still delete those.
const DELETE_RESTRICTED_ROLES = new Set([
  "student",
  "parent",
  "instructor",
  "admin",
]);

export const canDeleteUserWithRole = (user, targetRole) => {
  if (!isSubAdmin(user)) return true;
  return !DELETE_RESTRICTED_ROLES.has(targetRole);
};

// Governs creating a new admin account, and editing/deactivating/resetting
// the password of an existing one. Callers decide separately whether to
// exempt a sub admin acting on their own account.
export const canManageAdminAccounts = (user) => !isSubAdmin(user);

export const canManageAccessCodes = (user) => !isSubAdmin(user);

export const canDeleteCourses = (user) => !isSubAdmin(user);
