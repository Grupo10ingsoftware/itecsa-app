import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { APP_ROUTES } from '../config/routes'
import { PERMISSIONS } from '../config/permissions'
import { ADMINISTRATIVE_ROLES, ROLES } from '../config/roles'
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
const OrderHistoryPage = lazy(() => import('../modules/orderHistory/pages/OrderHistoryPage'))
const OrderHistoryDetailPage = lazy(() => import('../modules/orderHistory/pages/OrderHistoryDetailPage'))
const ProductionCalendarPage = lazy(() => import('../modules/productionCalendar/pages/ProductionCalendarPage'))
const MessageInboxPage = lazy(() => import('../modules/messages/pages/MessageInboxPage'))
const MessageDetailPage = lazy(() => import('../modules/messages/pages/MessageDetailPage'))
const MetricsPage = lazy(() => import('../modules/metrics/pages/MetricsPage'))

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
            <Route path="perfil" element={<RoleGuard requiredPermission={PERMISSIONS.READ_PROFILE}><ProfilePage /></RoleGuard>} />
            <Route path="mensajes" element={<RoleGuard requiredPermission={PERMISSIONS.READ_MESSAGES}><MessageInboxPage /></RoleGuard>} />
            <Route path="mensajes/:messageId" element={<RoleGuard requiredPermission={PERMISSIONS.READ_MESSAGES}><MessageDetailPage /></RoleGuard>} />
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
            <Route path="historial-pedidos" element={<RoleGuard requiredPermission={PERMISSIONS.READ_ORDERS}><OrderHistoryPage /></RoleGuard>} />
            <Route path="historial-pedidos/:orderId" element={<RoleGuard requiredPermission={PERMISSIONS.READ_ORDERS}><OrderHistoryDetailPage /></RoleGuard>} />
            <Route
              path="calendario-produccion"
              element={
                <RoleGuard requiredPermission={PERMISSIONS.READ_CALENDAR}>
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
                  requiredRoles={ADMINISTRATIVE_ROLES}
                >
                  <UserManagementPage />
                </RoleGuard>
              }
            />
            <Route path="admin/usuarios/nuevo" element={<Navigate replace to={APP_ROUTES.ADMIN_USERS} />} />
            <Route
              path="metricas"
              element={
                <RoleGuard
                  requiredPermission={PERMISSIONS.VIEW_METRICS}
                  requiredRoles={[ROLES.ADMINISTRADOR, ROLES.GERENCIA, ROLES.SOPORTE]}
                >
                  <MetricsPage />
                </RoleGuard>
              }
            />
          </Route>
        </Route>

        <Route path="*" element={<UnknownRouteRedirect />} />
      </Routes>
    </Suspense>
  );
}
