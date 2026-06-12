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
    createUser: (user) => {
      const formData = new FormData()

      formData.append('nombreUsuario', user.nombreUsuario)
      formData.append('apellidoUsuario', user.apellidoUsuario)
      formData.append('rutUsuario', user.rutUsuario)
      formData.append('correoUsuario', user.correoUsuario)
      formData.append('rolUsuario', user.rolUsuario)
      formData.append('firmaElectronica', user.firmaElectronica)

      return apiClient.post('/admin/users', formData)
    },
    updateUser: ({
      idUsuarioAutenticacionExterna,
      nombreUsuario,
      apellidoUsuario,
      correoUsuario,
      rolUsuario,
      estadoUsuario,
    }) =>
      apiClient.patch(`/admin/users/${encodeURIComponent(idUsuarioAutenticacionExterna)}`, {
        nombreUsuario,
        apellidoUsuario,
        correoUsuario,
        rolUsuario,
        estadoUsuario,
      }),
    unlinkUser: ({ idUsuarioAutenticacionExterna }) =>
      apiClient.patch(`/admin/users/${encodeURIComponent(idUsuarioAutenticacionExterna)}/status`, {
        estadoUsuario: 'Desvinculado',
      }),
    requestPasswordSetupEmail: ({ correoUsuario }) =>
      apiClient.post('/admin/users/password-setup-email', { correoUsuario }),
  }
}
