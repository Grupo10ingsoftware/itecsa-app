import { USER_STATUS } from '../../../config/userLifecycle.js'

function buildQueryString(params) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      searchParams.set(key, String(value))
    }
  })

  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

export function createAdminUsersApi(apiClient) {
  // Deduplicate only simultaneous reads. Completed activity is never retained:
  // each deliberate reopen must be authorized by the backend again.
  const movementsInFlight = new Map()
  function getMovements(userId, { page = 1, perPage = 10, search = '' } = {}) {
    const key = JSON.stringify([userId, page, perPage, search])
    const inFlight = movementsInFlight.get(key)
    if (inFlight) return inFlight

    const request = apiClient.get(
      `/admin/users/${encodeURIComponent(userId)}/movements${buildQueryString({ page, perPage, search })}`,
    ).finally(() => {
      if (movementsInFlight.get(key) === request) movementsInFlight.delete(key)
    })
    movementsInFlight.set(key, request)
    return request
  }

  return {
    listUsers: ({ page = 1, perPage = 10, search = '', estadoUsuario = '', rolUsuario = '' } = {}) =>
      apiClient.get(
        `/admin/users${buildQueryString({
          page,
          perPage,
          search,
          estadoUsuario,
          rolUsuario,
        })}`,
    ),
    getMovements,
    getSummary: () => apiClient.get('/admin/users/summary'),
    createUser: ({ nombreUsuario, apellidoUsuario, rutUsuario, correoUsuario, rolUsuario }) =>
      apiClient.post('/admin/users', {
        nombreUsuario,
        apellidoUsuario,
        rutUsuario,
        correoUsuario,
        rolUsuario,
      }),
    updateUser: ({
      idUsuarioAutenticacionExterna,
      nombreUsuario,
      apellidoUsuario,
      correoUsuario,
      rolUsuario,
      pin,
    }) =>
      apiClient.patch(`/admin/users/${encodeURIComponent(idUsuarioAutenticacionExterna)}`, {
        nombreUsuario,
        apellidoUsuario,
        correoUsuario,
        rolUsuario,
        pin,
      }),
    unlinkUser: ({ idUsuarioAutenticacionExterna, pin }) =>
      apiClient.patch(`/admin/users/${encodeURIComponent(idUsuarioAutenticacionExterna)}/status`, {
        estadoUsuario: USER_STATUS.UNLINKED,
        pin,
      }),
    requestPasswordSetupEmail: ({ correoUsuario }) =>
      apiClient.post('/admin/users/password-setup-email', { correoUsuario }),
  }
}
