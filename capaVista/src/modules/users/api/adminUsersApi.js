export function createAdminUsersApi(apiClient) {
  return {
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
    requestPasswordSetupEmail: ({ correoUsuario }) =>
      apiClient.post('/admin/users/password-setup-email', { correoUsuario }),
  }
}
