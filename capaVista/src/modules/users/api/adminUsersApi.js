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
  // Scoped to this API instance/session; bound both freshness and memory.
  const movementsCache = new Map()
  function getMovements(userId, { page = 1, perPage = 10 } = {}) {
    const key = JSON.stringify([userId, page, perPage])
    const cached = movementsCache.get(key)
    if (cached && cached.expiresAt > Date.now()) return cached.promise

    const entry = { expiresAt: Infinity }
    entry.promise = apiClient.get(
      `/admin/users/${encodeURIComponent(userId)}/movements${buildQueryString({ page, perPage })}`,
    ).then((result) => {
      entry.expiresAt = Date.now() + 15_000
      return result
    }).catch((error) => {
      // Never retain failures: retry must reach the server.
      if (movementsCache.get(key) === entry) movementsCache.delete(key)
      if (error?.status === 401 || error?.status === 403) movementsCache.clear()
      throw error
    })
    movementsCache.delete(key)
    movementsCache.set(key, entry)
    if (movementsCache.size > 30) movementsCache.delete(movementsCache.keys().next().value)
    return entry.promise
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
    prefetchMovements: (userId) => { void getMovements(userId).catch(() => {}) },
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
        estadoUsuario: 'Desvinculado',
        pin,
      }),
    requestPasswordSetupEmail: ({ correoUsuario }) =>
      apiClient.post('/admin/users/password-setup-email', { correoUsuario }),
  }
}
