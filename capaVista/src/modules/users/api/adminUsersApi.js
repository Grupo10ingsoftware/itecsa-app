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
