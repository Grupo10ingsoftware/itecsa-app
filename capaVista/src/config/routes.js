import { PERMISSIONS } from './permissions'
import { ADMINISTRATIVE_ROLES, ROLES } from './roles'

export const APP_ROUTES = Object.freeze({
  LOGIN: '/login',
  PASSWORD_RESET: '/recuperar-contrasena',
  ACCESS_DENIED: '/access-denied',
  KANBAN: '/kanban',
  PROFILE: '/perfil',
  PAYMENTS: '/pagos',
  ADMIN_USERS: '/admin/usuarios',
  ADMIN_USERS_CREATE: '/admin/usuarios/nuevo',
  ORDERS_CREATE: '/ordenes/nuevo',
  ORDER_HISTORY: '/historial-pedidos',
  ORDER_HISTORY_DETAIL: '/historial-pedidos/:orderId',
  // Alias temporales para componentes del prototipo anterior que aún viven en el repositorio.
  PRODUCTION_HISTORY: '/historial-pedidos',
  PRODUCTION_HISTORY_DETAIL: '/historial-pedidos/:pedidoId',
  PRODUCTION_CALENDAR: '/calendario-produccion',
  MESSAGES: '/mensajes',
  MESSAGE_DETAIL: '/mensajes/:messageId',
  METRICS: '/metricas',
})

export const MAIN_NAVIGATION_ROUTES = Object.freeze([
  {
    label: 'Principal/Kanban',
    path: APP_ROUTES.KANBAN,
    permission: PERMISSIONS.VIEW_KANBAN_MODULE,
    requirementIds: Object.freeze(['UR 5.1', 'UR 5.2']),
  },
  {
    label: 'Mi perfil',
    path: APP_ROUTES.PROFILE,
    permission: PERMISSIONS.READ_PROFILE,
    requirementIds: Object.freeze(['UR 1.7']),
  },
  {
    label: 'Bandeja de mensajes',
    path: APP_ROUTES.MESSAGES,
    permission: PERMISSIONS.READ_MESSAGES,
    requirementIds: Object.freeze(['RF54', 'RF55', 'RF59', 'RF60']),
  },
  {
    label: 'Confirmar pago',
    path: APP_ROUTES.PAYMENTS,
    permission: PERMISSIONS.VIEW_PAYMENTS_MODULE,
    requirementIds: Object.freeze(['UR 3.1', 'UR 3.3', 'UR 3.7']),
  },
  {
    label: 'Gestion de usuarios',
    path: APP_ROUTES.ADMIN_USERS,
    permission: PERMISSIONS.MANAGE_USERS_VISUALLY,
    requiredRoles: ADMINISTRATIVE_ROLES,
    requirementIds: Object.freeze(['UR 1.4', 'UR 1.12', 'UR 1.13']),
  },
  {
    label: 'Registro de Orden',
    path: APP_ROUTES.ORDERS_CREATE,
    permission: PERMISSIONS.VIEW_ORDERS_MODULE,
    requirementIds: Object.freeze(['UR 19.1', 'UR 19.2', 'UR 19.3', 'UR 19.4', 'UR 19.5']),
  },
  {
    label: 'Historial de pedidos',
    path: APP_ROUTES.ORDER_HISTORY,
    permission: PERMISSIONS.READ_ORDERS,
    requirementIds: Object.freeze(['RF64', 'RF65', 'RF66', 'RF67', 'RF68']),
  },
  {
    label: 'Calendario',
    path: APP_ROUTES.PRODUCTION_CALENDAR,
    permission: PERMISSIONS.READ_CALENDAR,
    requirementIds: Object.freeze(['RF49']),
  },
  {
    label: 'Reportes y estadísticas',
    path: APP_ROUTES.METRICS,
    permission: PERMISSIONS.VIEW_METRICS,
    requiredRoles: [ROLES.ADMINISTRADOR,ROLES.GERENCIA,ROLES.SOPORTE],
    requirementIds: Object.freeze(['RF70', 'RF71']),
  }
])
