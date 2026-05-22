import { ROLES } from './roles'

export const PERMISSIONS = Object.freeze({
  VIEW_MAIN_NAVIGATION: 'view:main-navigation',
  VIEW_KANBAN_MODULE: 'view:kanban-module',
  VIEW_PAYMENTS_MODULE: 'view:payments-module',
  VIEW_OWN_PROFILE: 'view:own-profile',
  CREATE_USERS_VISUALLY: 'create:users-visually',
  MANAGE_USERS_VISUALLY: 'manage:users-visually',
})

// Estos permisos ordenan la experiencia visual del frontend y no reemplazan la autorizacion real del backend.
export const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.ADMINISTRADOR]: Object.freeze([
    PERMISSIONS.VIEW_MAIN_NAVIGATION,
    PERMISSIONS.VIEW_KANBAN_MODULE,
    PERMISSIONS.VIEW_PAYMENTS_MODULE,
    PERMISSIONS.VIEW_OWN_PROFILE,
    PERMISSIONS.CREATE_USERS_VISUALLY,
    PERMISSIONS.MANAGE_USERS_VISUALLY,
  ]),
  [ROLES.GERENCIA]: Object.freeze([
    PERMISSIONS.VIEW_MAIN_NAVIGATION,
    PERMISSIONS.VIEW_KANBAN_MODULE,
    PERMISSIONS.VIEW_PAYMENTS_MODULE,
    PERMISSIONS.VIEW_OWN_PROFILE,
  ]),
  [ROLES.OPERARIO]: Object.freeze([
    PERMISSIONS.VIEW_MAIN_NAVIGATION,
    PERMISSIONS.VIEW_KANBAN_MODULE,
    PERMISSIONS.VIEW_OWN_PROFILE,
  ]),
  [ROLES.VENTAS]: Object.freeze([
    PERMISSIONS.VIEW_MAIN_NAVIGATION,
    PERMISSIONS.VIEW_KANBAN_MODULE,
    PERMISSIONS.VIEW_OWN_PROFILE,
  ]),
  [ROLES.COBRANZAS]: Object.freeze([
    PERMISSIONS.VIEW_MAIN_NAVIGATION,
    PERMISSIONS.VIEW_KANBAN_MODULE,
    PERMISSIONS.VIEW_PAYMENTS_MODULE,
    PERMISSIONS.VIEW_OWN_PROFILE,
  ]),
})

export function getPermissionsForRole(role) {
  return ROLE_PERMISSIONS[role] ?? []
}

export function roleHasPermission(role, permission) {
  return getPermissionsForRole(role).includes(permission)
}
