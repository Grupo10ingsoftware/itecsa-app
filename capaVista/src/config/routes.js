import { PERMISSIONS } from './permissions'

export const APP_ROUTES = Object.freeze({
  LOGIN: '/login',
  ACCESS_DENIED: '/access-denied',
  KANBAN: '/kanban',
  PAYMENTS: '/pagos',
  ADMIN_USERS_CREATE: '/admin/usuarios/nuevo',
})

export const MAIN_NAVIGATION_ROUTES = Object.freeze([
  {
    label: 'Principal',
    path: APP_ROUTES.KANBAN,
    permission: PERMISSIONS.VIEW_KANBAN_MODULE,
    requirementIds: Object.freeze(['UR 5.1', 'UR 5.2']),
  },
  {
    label: 'Kanban',
    path: APP_ROUTES.KANBAN,
    permission: PERMISSIONS.VIEW_KANBAN_MODULE,
    requirementIds: Object.freeze(['UR 5.1', 'UR 5.2', 'UR 5.3']),
  },
  {
    label: 'Confirmar pago',
    path: APP_ROUTES.PAYMENTS,
    permission: PERMISSIONS.VIEW_PAYMENTS_MODULE,
    requirementIds: Object.freeze(['UR 3.1', 'UR 3.3', 'UR 3.7']),
  },
  {
    label: 'Crear usuario',
    path: APP_ROUTES.ADMIN_USERS_CREATE,
    permission: PERMISSIONS.CREATE_USERS_VISUALLY,
    requirementIds: Object.freeze(['UR 1.4', 'UR 1.12', 'UR 1.13']),
  },
])
