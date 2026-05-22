import { Navigate, Route, Routes } from 'react-router-dom'
import { PERMISSIONS } from '../config/permissions'
import { useAuth } from '../hooks/useAuth'
import AccessDeniedPage from '../modules/auth/pages/AccessDeniedPage'
import LoginPage from '../modules/auth/pages/LoginPage'
import KanbanBoardPage from '../modules/kanban/pages/KanbanBoardPage'
import UserCreatePage from '../modules/users/pages/UserCreatePage'
import AppLayout from '../shared/components/layout/AppLayout'
import ProtectedRoute from '../shared/components/navigation/ProtectedRoute'
import RoleGuard from '../shared/components/navigation/RoleGuard'

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
          <Route path="admin" element={<Navigate replace to="/admin/usuarios/nuevo" />} />
          <Route
            path="admin/usuarios/nuevo"
            element={
              <RoleGuard requiredPermission={PERMISSIONS.CREATE_USERS_VISUALLY}>
                <UserCreatePage />
              </RoleGuard>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<UnknownRouteRedirect />} />
    </Routes>
  )
}
