export const PASSWORD_RULES = Object.freeze([
  {
    id: 'length',
    label: 'Minimo 8 caracteres',
    test: (password) => password.length >= 8,
  },
  {
    id: 'uppercase',
    label: 'Al menos una mayuscula',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: 'lowercase',
    label: 'Al menos una minuscula',
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: 'number',
    label: 'Al menos un numero',
    test: (password) => /\d/.test(password),
  },
  {
    id: 'symbol',
    label: 'Al menos un simbolo especial',
    test: (password) => /[^A-Za-z0-9]/.test(password),
  },
])

export function getPasswordRuleResults(password) {
  return PASSWORD_RULES.map((rule) => ({
    ...rule,
    isValid: rule.test(password),
  }))
}
