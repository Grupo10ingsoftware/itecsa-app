import { NavLink } from 'react-router-dom'
import { MAIN_NAVIGATION_ROUTES } from '../../../config/routes'
import { useAuth } from '../../../hooks/useAuth'

export default function NavigationMenu() {
  const { hasPermission } = useAuth()

  return (
    <>
      {MAIN_NAVIGATION_ROUTES.filter((route) => hasPermission(route.permission)).map((route) => (
        <NavLink className="nav-link" key={`${route.path}-${route.label}`} to={route.path}>
          {route.label}
        </NavLink>
      ))}
    </>
  )
}
