import { Navigate, Route, Routes } from 'react-router-dom'
import { APP_ROUTES } from '../config/routes'
import { PERMISSIONS } from '../config/permissions'
import { ROLES } from '../config/roles'
import { useAuth } from '../hooks/useAuth'
import AccessDeniedPage from '../modules/auth/pages/AccessDeniedPage'
import LoginPage from '../modules/auth/pages/LoginPage'
import KanbanBoardPage from '../modules/kanban/pages/KanbanBoardPage'
import PaymentConfirmationPage from '../modules/payments/pages/PaymentConfirmationPage'
import UserCreatePage from '../modules/users/pages/UserCreatePage'
import OrderCreatePage from '../modules/orders/pages/OrderCreatePage'
import AppLayout from '../shared/components/layout/AppLayout'
import ProtectedRoute from '../shared/components/navigation/ProtectedRoute'
import RoleGuard from '../shared/components/navigation/RoleGuard'

function UnknownRouteRedirect() {
  const { isAuthenticated } = useAuth()

  // Redireccion visual para rutas no registradas segun estado de sesion Auth0.
  return <Navigate replace to={isAuthenticated ? APP_ROUTES.KANBAN : APP_ROUTES.LOGIN} />
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path={APP_ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={APP_ROUTES.ACCESS_DENIED} element={<AccessDeniedPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to={APP_ROUTES.KANBAN} replace />} />
          <Route
            path="kanban"
            element={
              <RoleGuard requiredPermission={PERMISSIONS.VIEW_KANBAN_MODULE}>
                <KanbanBoardPage />
              </RoleGuard>
            }
          />
          <Route
            path="pagos"
            element={
              <RoleGuard requiredPermission={PERMISSIONS.VIEW_PAYMENTS_MODULE}>
                <PaymentConfirmationPage />
              </RoleGuard>
            }
          />
          <Route
            path="ordenes/nuevo"
            element={
              <RoleGuard requiredPermission={PERMISSIONS.VIEW_ORDERS_MODULE}>
                <OrderCreatePage />
              </RoleGuard>
            }
          />
          <Route path="admin" element={<Navigate replace to={APP_ROUTES.ADMIN_USERS_CREATE} />} />
          <Route
            path="admin/usuarios/nuevo"
            element={
              <RoleGuard requiredRole={ROLES.ADMINISTRADOR}>
                <UserCreatePage />
              </RoleGuard>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<UnknownRouteRedirect />} />
    </Routes>
  );
}
