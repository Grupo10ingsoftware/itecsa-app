import { NavLink } from 'react-router-dom'
import { MAIN_NAVIGATION_ROUTES } from '../../../config/routes'
import { useAuth } from '../../../hooks/useAuth'
import styles from '../layout/Layout.module.css'

const ROUTE_ICONS = Object.freeze({
  Principal: 'bi-house-door',
  Kanban: 'bi-kanban',
  'Confirmar pago': 'bi-cash-coin',
  'Crear usuario': 'bi-person-plus',
  'Registro de Orden': 'bi-receipt',
})

export default function NavigationMenu({ onNavigate }) {
  const { hasPermission } = useAuth()

  return (
    <div className={styles.navigationList}>
      {MAIN_NAVIGATION_ROUTES.filter((route) => hasPermission(route.permission)).map((route) => (
        <NavLink className={styles.navLink} key={`${route.path}-${route.label}`} onClick={onNavigate} title={route.label} to={route.path}>
          <i className={`bi ${ROUTE_ICONS[route.label] ?? 'bi-circle'} ${styles.navIcon}`} aria-hidden="true" />
          <span className={styles.navText}>{route.label}</span>
        </NavLink>
      ))}
    </div>
  )
}
