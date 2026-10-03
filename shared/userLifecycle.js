export const USER_STATUS = Object.freeze({
  ACTIVE: 'Activo',
  LEGACY_LINKED: 'Vinculado',
  UNLINKED: 'Desvinculado',
  PENDING_ROLE: 'Pendiente rol',
})

export const ACTIVE_USER_STATUSES = Object.freeze([
  USER_STATUS.ACTIVE,
  USER_STATUS.LEGACY_LINKED,
])

export const USER_STATUS_FILTERS = Object.freeze([
  ...ACTIVE_USER_STATUSES,
  USER_STATUS.UNLINKED,
  USER_STATUS.PENDING_ROLE,
])

export const MUTABLE_USER_STATUSES = Object.freeze([
  ...ACTIVE_USER_STATUSES,
  USER_STATUS.UNLINKED,
])

const ACTIVE_USER_STATUS_SET = new Set(ACTIVE_USER_STATUSES)

export function isActiveUserStatus(status) {
  return ACTIVE_USER_STATUS_SET.has(status)
}

export function normalizeUserStatusForStorage(status) {
  return status === USER_STATUS.LEGACY_LINKED ? USER_STATUS.ACTIVE : status
}

export function displayUserStatus(status) {
  return status === USER_STATUS.ACTIVE ? USER_STATUS.LEGACY_LINKED : status
}
