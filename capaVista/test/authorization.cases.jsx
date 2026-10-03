import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../src/app/providers/authContext'
import { PERMISSIONS } from '../src/config/permissions'
import RoleGuard from '../src/shared/components/navigation/RoleGuard'
import PaymentRowActions from '../src/modules/payments/components/PaymentRowActions'
import Topbar from '../src/shared/components/layout/Topbar'
import NavigationMenu from '../src/shared/components/navigation/NavigationMenu'
import { PAYMENT_STATUS } from '../src/config/status'
import { ROLES, ROLE_PERMISSIONS, BUSINESS_PERMISSIONS, can, manageableRoles } from '../../shared/authorization'

export function run() {
 let count = 0
 const AP=ROLES.ADMINISTRADOR, AV=ROLES.ADMIN_VENTAS, AC=ROLES.ADMIN_COBRANZAS, OV=ROLES.VENTAS, OC=ROLES.COBRANZAS, S=ROLES.SOPORTE
 const routes=[['/calendario-produccion','read:production-calendar',[AP,AV,OV,S]],['/pagos','read:payments',[AC,OC,S]],['/admin/usuarios','manage:users',[AP,AV,AC,S]],['/ordenes/nuevo','create:orders',[AV,OV,S]],['/kanban','read:orders',Object.values(ROLES)]]
 function context(role,permissions=BUSINESS_PERMISSIONS) {return {authStatus:'authenticated',isAuthenticated:true,isLoading:false,user:{rolUsuario:role},hasPermission:p=>can(role,permissions,p),hasRole:r=>role===r}}
 for(const [path,permission,allowed] of routes) for(const role of Object.values(ROLES)) {
  const html=renderToStaticMarkup(<MemoryRouter initialEntries={[path]}><AuthContext.Provider value={context(role)}><RoleGuard requiredPermission={permission}><div>contenido-autorizado</div></RoleGuard></AuthContext.Provider></MemoryRouter>)
  assert.equal(html.includes('contenido-autorizado'),allowed.includes(role),`${path} ${role}`);count++
 }
 for(const role of Object.values(ROLES)) {
  const html=renderToStaticMarkup(<MemoryRouter initialEntries={['/metricas']}><AuthContext.Provider value={context(role)}><RoleGuard requiredPermission="view:metrics" requiredRoles={[AP,ROLES.GERENCIA,S]}><div>contenido-autorizado</div></RoleGuard></AuthContext.Provider></MemoryRouter>)
  assert.equal(html.includes('contenido-autorizado'),[AP,ROLES.GERENCIA,S].includes(role),`/metricas ${role}`);count++
 }
 for(const role of Object.values(ROLES)) {
  assert.equal(manageableRoles(role).includes(S),false);count++
  const html=renderToStaticMarkup(<MemoryRouter><AuthContext.Provider value={context(role,[])}><RoleGuard requiredPermission="read:orders"><div>contenido-autorizado</div></RoleGuard></AuthContext.Provider></MemoryRouter>)
  assert.equal(html.includes('contenido-autorizado'),false);count++
 }
 for (const role of Object.values(ROLES)) for (const permissions of [BUSINESS_PERMISSIONS, [], ['read:own-profile'], ['read:own-messages']]) {
  const auth = context(role, permissions)
  const wrap = child => <MemoryRouter initialEntries={['/perfil']}><AuthContext.Provider value={auth}>{child}</AuthContext.Provider></MemoryRouter>
  const header = renderToStaticMarkup(wrap(<Topbar />))
  const sidebar = renderToStaticMarkup(wrap(<NavigationMenu />))
  assert.equal(header.includes('href="/perfil"'), auth.hasPermission('read:own-profile'))
  assert.equal(header.includes('href="/mensajes"'), auth.hasPermission('read:own-messages'))
  assert.equal(header.includes('aria-label="Notificaciones"'), auth.hasPermission('read:own-messages'))
  assert.equal(sidebar.includes('href="/perfil"') || sidebar.includes('href="/mensajes"'), false)
  count += 4
 }
 for(const role of [AP,ROLES.GERENCIA,S]) {
  const html=renderToStaticMarkup(<MemoryRouter><AuthContext.Provider value={context(role,BUSINESS_PERMISSIONS.filter(p=>p!=='view:metrics'))}><RoleGuard requiredPermission={PERMISSIONS.VIEW_METRICS}><div>contenido-autorizado</div></RoleGuard></AuthContext.Provider></MemoryRouter>)
  assert.equal(html.includes('contenido-autorizado'),false);count++
 }
 for(const [permission,retired] of [[PERMISSIONS.VIEW_KANBAN_MODULE,'view:kanban-module'],[PERMISSIONS.VIEW_PAYMENTS_MODULE,'view:payments-module']]) {
  const html=renderToStaticMarkup(<MemoryRouter><AuthContext.Provider value={context(S,[retired])}><RoleGuard requiredPermission={permission}><div>contenido-autorizado</div></RoleGuard></AuthContext.Provider></MemoryRouter>)
  assert.equal(html.includes('contenido-autorizado'),false);count++
 }
 for(const role of [AV,OV]) {assert.equal(can(role,ROLE_PERMISSIONS[role],'read:production-calendar'),true);assert.equal(can(role,ROLE_PERMISSIONS[role],'update:order-delivery-date'),false);count+=2}
 for(const role of Object.values(ROLES)) for(const status of [PAYMENT_STATUS.PENDIENTE,PAYMENT_STATUS.RECHAZADO]) {
  const auth=context(role)
  const html=renderToStaticMarkup(<AuthContext.Provider value={auth}><PaymentRowActions editingStatus={{}} order={{id:1,paymentStatus:status}} canUpdatePaymentStatus={auth.hasPermission('update:payment-status')} /></AuthContext.Provider>)
  const allowed=status===PAYMENT_STATUS.PENDIENTE?[AC,OC,S]:[AC,S]
  assert.equal(html.includes('Gestionar'),allowed.includes(role),`${role} ${status}`);count++
 }
 console.log(`${count} verificaciones frontend: rutas directas, acciones ocultas, scopes y calendario solo lectura OK`)
}
