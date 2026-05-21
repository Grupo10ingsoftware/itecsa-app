import { Navigate, Route, Routes } from 'react-router-dom'
import { ROLES } from '../config/roles'
import { useAuth } from '../hooks/useAuth'
import AccessDeniedPage from '../modules/auth/pages/AccessDeniedPage'
import LoginPage from '../modules/auth/pages/LoginPage'
import KanbanBoardPage from '../modules/kanban/pages/KanbanBoardPage'
import AppLayout from '../shared/components/layout/AppLayout'
import ProtectedRoute from '../shared/components/navigation/ProtectedRoute'
import RoleGuard from '../shared/components/navigation/RoleGuard'

function AdminPlaceholderPage() {
  return (
    <section className="p-4">
      <h1 className="h4 mb-2">Administracion</h1>
      <p className="text-secondary mb-0">
        Ruta visual reservada para validar acceso por rol en el frontend inicial.
      </p>
    </section>
  )
}

function UnknownRouteRedirect() {
  const { isAuthenticated } = useAuth()

  // Redireccion visual para rutas no registradas mientras la sesion sigue siendo simulada.
  return <Navigate replace to={isAuthenticated ? '/kanban' : '/login'} />
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/access-denied" element={<AccessDeniedPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/kanban" replace />} />
          <Route path="kanban" element={<KanbanBoardPage />} />
          <Route
            path="admin"
            element={
              <RoleGuard requiredRole={ROLES.ADMINISTRADOR}>
                <AdminPlaceholderPage />
              </RoleGuard>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<UnknownRouteRedirect />} />
    </Routes>
  )
}
