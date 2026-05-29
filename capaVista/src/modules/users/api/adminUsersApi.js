export function createAdminUsersApi(apiClient) {
  return {
    createUser: ({ primerNombre, apellidoPaterno, correoUsuario, rolUsuario }) =>
      apiClient.post('/admin/users', {
        primerNombre,
        apellidoPaterno,
        correoUsuario,
        rolUsuario,
      }),
    requestPasswordSetupEmail: ({ correoUsuario }) =>
      apiClient.post('/admin/users/password-setup-email', { correoUsuario }),
  }
}
