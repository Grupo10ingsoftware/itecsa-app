import { getRoleLabel, isOfficialRole } from '../../../config/roles'

export default function RoleBadge({ role }) {
  const displayRole = isOfficialRole(role) ? getRoleLabel(role) : 'Rol no reconocido'
  const badgeClass = isOfficialRole(role) ? 'text-bg-light' : 'text-bg-secondary'

  return (
    <span className={`badge ${badgeClass}`}>
      {/* Rol visual desde sesion simulada; la autorizacion real corresponde al backend. */}
      {displayRole}
    </span>
  )
}
