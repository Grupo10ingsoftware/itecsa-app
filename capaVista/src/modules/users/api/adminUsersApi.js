export function createAdminUsersApi(apiClient) {
  return {
    createUser: ({ correoUsuario, rolUsuario }) =>
      apiClient.post('/admin/users', {
        correoUsuario,
        rolUsuario,
      }),
    requestPasswordSetupEmail: ({ correoUsuario }) =>
      apiClient.post('/admin/users/password-setup-email', { correoUsuario }),
  }
}
