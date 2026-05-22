// Reglas reutilizables para creacion de usuario o cambio de contrasena; no se muestran en el login.
export const PASSWORD_RULES = Object.freeze([
  {
    id: 'length',
    label: 'Mínimo 8 caracteres',
    test: (password) => password.length >= 8,
  },
  {
    id: 'uppercase',
    label: 'Al menos una mayúscula',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: 'lowercase',
    label: 'Al menos una minúscula',
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: 'number',
    label: 'Al menos un número',
    test: (password) => /\d/.test(password),
  },
  {
    id: 'symbol',
    label: 'Al menos un símbolo especial',
    test: (password) => /[^A-Za-z0-9]/.test(password),
  },
])

export function getPasswordRuleResults(password) {
  return PASSWORD_RULES.map((rule) => ({
    ...rule,
    isValid: rule.test(password),
  }))
}
