import { ROLES, RECOGNIZED_ROLES, ADMIN_ROLES } from '../../../shared/authorization.js';
export { ROLES, FUNCTIONAL_ROLES, manageableRoles, canManageUser } from '../../../shared/authorization.js';
export const OFFICIAL_ROLES = new Set(RECOGNIZED_ROLES);
export const ADMINISTRATIVE_ROLES = new Set(ADMIN_ROLES);
