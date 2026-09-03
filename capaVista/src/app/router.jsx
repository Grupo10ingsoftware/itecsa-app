import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { APP_ROUTES } from '../config/routes'
import { PERMISSIONS } from '../config/permissions'
import { ROLES } from '../config/roles'
import { useAuth } from '../hooks/useAuth'
import AccessDeniedPage from '../modules/auth/pages/AccessDeniedPage'
import LoginPage from '../modules/auth/pages/LoginPage'
import AppLayout from '../shared/components/layout/AppLayout'
import ProtectedRoute from '../shared/components/navigation/ProtectedRoute'
import RoleGuard from '../shared/components/navigation/RoleGuard'

const KanbanBoardPage = lazy(() => import('../modules/kanban/pages/KanbanBoardPage'))
const ProfilePage = lazy(() => import('../modules/profile/pages/ProfilePage'))
const PaymentConfirmationPage = lazy(() => import('../modules/payments/pages/PaymentConfirmationPage'))
const UserManagementPage = lazy(() => import('../modules/users/pages/UserManagementPage'))
const OrderCreatePage = lazy(() => import('../modules/orders/pages/OrderCreatePage'))
const PasswordResetPage = lazy(() => import('../modules/auth/pages/PasswordResetPage'))
const ProductionHistoryPage = lazy(() => import('../modules/productionHistory/pages/ProductionHistoryPage'))
const ProductionHistoryDetailPage = lazy(() => import('../modules/productionHistory/pages/ProductionHistoryDetailPage'))
const ProductionCalendarPage = lazy(() => import('../modules/productionCalendar/pages/ProductionCalendarPage'))
const MessageInboxPage = lazy(() => import('../modules/messages/pages/MessageInboxPage'))
const MessageDetailPage = lazy(() => import('../modules/messages/pages/MessageDetailPage'))

function RouteLoadingState() {
  return (
    <div className="d-flex align-items-center justify-content-center py-5" role="status">
      <span className="spinner-border text-warning" aria-hidden="true" />
      <span className="visually-hidden">Cargando modulo...</span>
    </div>
  )
}

function UnknownRouteRedirect() {
  const { isAuthenticated } = useAuth()

  // Redireccion visual para rutas no registradas segun estado de sesion Auth0.
  return <Navigate replace to={isAuthenticated ? APP_ROUTES.KANBAN : APP_ROUTES.LOGIN} />
}

export default function AppRouter() {
  return (
    <Suspense fallback={<RouteLoadingState />}>
      <Routes>
        <Route path={APP_ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={APP_ROUTES.PASSWORD_RESET} element={<PasswordResetPage />} />
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
            <Route path="perfil" element={<ProfilePage />} />
            <Route path="mensajes" element={<MessageInboxPage />} />
            <Route path="mensajes/:messageId" element={<MessageDetailPage />} />
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
            <Route
              path="historial-produccion"
              element={
                <RoleGuard requiredRole={ROLES.ADMINISTRADOR}>
                  <ProductionHistoryPage />
                </RoleGuard>
              }
            />
            <Route
              path="historial-produccion/:pedidoId"
              element={
                <RoleGuard requiredRole={ROLES.ADMINISTRADOR}>
                  <ProductionHistoryDetailPage />
                </RoleGuard>
              }
            />
            <Route
              path="calendario-produccion"
              element={
                <RoleGuard requiredRole={ROLES.ADMINISTRADOR}>
                  <ProductionCalendarPage />
                </RoleGuard>
              }
            />
            <Route path="admin" element={<Navigate replace to={APP_ROUTES.ADMIN_USERS} />} />
            <Route
              path="admin/usuarios"
              element={
                <RoleGuard
                  requiredPermission={PERMISSIONS.MANAGE_USERS_VISUALLY}
                  requiredRole={ROLES.ADMINISTRADOR}
                >
                  <UserManagementPage />
                </RoleGuard>
              }
            />
            <Route path="admin/usuarios/nuevo" element={<Navigate replace to={APP_ROUTES.ADMIN_USERS} />} />
          </Route>
        </Route>

        <Route path="*" element={<UnknownRouteRedirect />} />
      </Routes>
    </Suspense>
  );
}
