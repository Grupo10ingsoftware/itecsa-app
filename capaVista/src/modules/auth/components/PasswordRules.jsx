import { getPasswordRuleResults } from '../utils/authValidation'

export default function PasswordRules({ password }) {
  const ruleResults = getPasswordRuleResults(password)

  return (
    <div className="mt-2" aria-live="polite">
      <p className="mb-1 small fw-semibold text-secondary">Reglas de contraseña</p>
      <ul className="list-unstyled mb-0 small">
        {ruleResults.map((rule) => (
          <li
            className={rule.isValid ? 'text-success' : 'text-secondary'}
            key={rule.id}
          >
            <i
              className={`bi ${rule.isValid ? 'bi-check-circle-fill' : 'bi-circle'} me-2`}
              aria-hidden="true"
            />
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
