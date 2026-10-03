import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import '../src/styles/global.css'
import '../src/styles/bootstrap-overrides.css'
import '../src/styles/theme.css'
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Context } from '@auth0/auth0-react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AuthContext } from '../src/app/providers/authContext'
import AppLayout from '../src/shared/components/layout/AppLayout'
import { BUSINESS_PERMISSIONS, ROLES, can } from '../../shared/authorization'

const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const assert = (condition, message) => { if (!condition) throw new Error(message) }
async function waitFor(predicate) { for (let i = 0; i < 100; i++) { if (predicate()) return; await pause(20) } throw new Error('La navegación no terminó') }
const calls = []
const originalFetch = window.fetch
const origin = new URL(import.meta.env.VITE_API_BASE_URL).origin
let notifications = [{ id_mensaje: 101, Asunto: 'Mensaje de prueba', contenido: 'Contenido de prueba', fecha_publicacion: '2026-10-03T00:00:00Z' }]
window.fetch = async (url, options = {}) => {
  if (!String(url).startsWith(origin)) return originalFetch(url, options)
  const path = new URL(url).pathname, method = options.method ?? 'GET'
  calls.push({ path, method })
  assert(new Headers(options.headers).get('Authorization') === 'Bearer test-token', 'Falta token')
  if (path === '/api/messages/notifications' && method === 'GET') return Response.json({ notifications, unreadCount: notifications.length })
  if (path === '/api/messages/notifications' && method === 'PATCH') { notifications = []; return Response.json({}) }
  if (path === '/api/messages/101/read' && method === 'PATCH') return Response.json({})
  throw new Error(`Consulta inesperada del header: ${method} ${path}`)
}
const auth0 = { user: { sub: 'auth0|layout' }, getAccessTokenSilently: async () => 'test-token' }
export function Page() { const { pathname } = useLocation(); return <h1 id="route" style={{ padding: '1rem' }}>{pathname}</h1> }
export function App() {
  const [permissions, setPermissions] = useState(BUSINESS_PERMISSIONS)
  const [role, setRole] = useState(ROLES.SOPORTE)
  const [longIdentity, setLongIdentity] = useState(false)
  const auth = { user: { sub: 'auth0|layout', primerNombre: longIdentity ? 'NombreExtremadamenteLargo'.repeat(4) : 'Camila',
    apellidoPaterno: longIdentity ? 'ApellidoExtremadamenteLargo'.repeat(3) : 'Pérez',
    email: longIdentity ? `${'correo'.repeat(30)}@example.invalid` : 'camila@example.invalid', rolUsuario: role },
    hasPermission: permission => can(role, permissions, permission), hasRole: requested => role === requested,
    logout: () => { window.logoutCalls = (window.logoutCalls ?? 0) + 1 } }
  return <Auth0Context.Provider value={auth0}><AuthContext.Provider value={auth}>
    <MemoryRouter initialEntries={['/kanban']}><Routes><Route element={<AppLayout />}><Route path="*" element={<Page />} /></Route></Routes></MemoryRouter>
    <button hidden id="long-identity" onClick={() => { setLongIdentity(true); setRole(ROLES.ADMINISTRADOR) }}>Identidad larga</button>
    <button hidden id="deny-messages" onClick={() => setPermissions(BUSINESS_PERMISSIONS.filter(permission => permission !== 'read:own-messages'))}>Sin mensajes</button>
    <button hidden id="deny-profile" onClick={() => setPermissions([])}>Sin perfil</button>
  </AuthContext.Provider></Auth0Context.Provider>
}
createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
const header = () => document.querySelector('header')
const sidebar = () => document.querySelector('nav[aria-label="Menú principal"]')
const actions = () => document.querySelector('nav[aria-label="Acciones del usuario"]')
const link = label => actions().querySelector(`a[aria-label="${label}"]`)
const bell = () => actions()?.querySelector('button[aria-label^="Notificaciones"]')
const button = label => [...document.querySelectorAll('button')].find(item => item.textContent.trim() === label)
function noOverflow() {
  assert(document.documentElement.scrollWidth <= innerWidth + 1, `Overflow a ${innerWidth}px`)
  const elements = [header(), actions(), ...actions().querySelectorAll('a, button[aria-label^="Notificaciones"]')]
  for (const element of elements) { const rect = element.getBoundingClientRect(); assert(rect.left >= 0 && rect.right <= innerWidth + 1, 'Control fuera de pantalla') }
}
async function capture(name) { window.layoutCapture = name; await pause(400) }
window.layoutTest = { status: 'running' }
async function run() {
  try {
    await waitFor(() => bell()?.textContent.includes('1'))
    assert(calls.filter(call => call.method === 'GET').length === 1, 'Header duplicó consultas iniciales')
    assert(!sidebar().querySelector('a[href="/perfil"], a[href="/mensajes"]'), 'Accesos duplicados en sidebar')
    const labels = [...sidebar().querySelectorAll('a')].map(item => item.title)
    for (const label of ['Principal/Kanban', 'Confirmar pago', 'Gestion de usuarios', 'Registro de Orden', 'Historial de pedidos', 'Calendario', 'Métricas', 'Documentos', 'Solicitudes', 'Reportar incidente']) assert(labels.includes(label), `Perdió ${label}`)
    const controls = [...actions().children].map(item => item.querySelector('button')?.getAttribute('aria-label') ?? item.getAttribute('aria-label'))
    assert(controls[0].startsWith('Notificaciones') && controls[1] === 'Bandeja de mensajes' && controls[2] === 'Mi perfil', 'Orden incorrecto')
    assert(!link('Bandeja de mensajes').textContent.trim(), 'La bandeja no es icon-only')
    const identity = header().querySelector('[aria-label="Perfil de usuario autenticado"]')
    assert(identity.textContent.includes('Camila Pérez') && identity.textContent.includes('camila@example.invalid'), 'Identidad no proviene de sesión')
    assert(identity.querySelector('.bi-person-circle') && !identity.querySelector('img'), 'Avatar no genérico')
    assert(identity.getBoundingClientRect().left < actions().getBoundingClientRect().left, 'Identidad no está a la izquierda')
    for (const control of [bell(), link('Bandeja de mensajes'), link('Mi perfil')]) { const rect = control.getBoundingClientRect(); assert(rect.width >= 44 && rect.height >= 44, 'Control no táctil') }
    link('Mi perfil').focus(); assert(document.activeElement === link('Mi perfil'), 'Perfil no recibe foco')
    assert(getComputedStyle(link('Mi perfil')).outlineStyle !== 'none', 'Falta focus visible')
    window.layoutKeyboardCheck = 'profile'
    await waitFor(() => window.layoutKeyboardCheck === 'done')
    await waitFor(() => document.querySelector('#route').textContent === '/perfil')
    assert(link('Mi perfil').getAttribute('aria-current') === 'page', 'Perfil no indica ruta activa')
    assert(getComputedStyle(link('Mi perfil')).color === 'rgb(255, 255, 255)', 'Perfil activo no conserva blanco')
    bell().focus(); window.layoutKeyboardCheck = 'bell'
    await waitFor(() => window.layoutKeyboardCheck === 'done')
    assert(document.activeElement === link('Bandeja de mensajes'), 'Tab no continúa hacia la bandeja')
    link('Bandeja de mensajes').click(); await waitFor(() => document.querySelector('#route').textContent === '/mensajes')
    bell().click(); await waitFor(() => document.querySelector('[aria-label="Notificaciones nuevas"] article'))
    const panel = document.querySelector('[aria-label="Notificaciones nuevas"]').getBoundingClientRect()
    assert(panel.left >= 0 && panel.right <= innerWidth + 1, 'Notificaciones fuera de pantalla')
    document.querySelector('[aria-label="Notificaciones nuevas"] article button').click()
    await waitFor(() => document.querySelector('#route').textContent === '/mensajes/101')
    assert(calls.some(call => call.path.endsWith('/101/read') && call.method === 'PATCH'), 'Notificación no reutiliza apertura')
    bell().click(); await waitFor(() => button('Limpiar')); button('Limpiar').click()
    await waitFor(() => document.querySelector('[aria-label="Notificaciones nuevas"]').textContent.includes('Todo al día'))
    assert(calls.some(call => call.path === '/api/messages/notifications' && call.method === 'PATCH'), 'Limpiar no reutiliza endpoint')
    bell().click(); noOverflow(); await capture('header')
    if (innerWidth < 992) {
      document.querySelector('[aria-label="Abrir menú lateral"]').click(); await pause(250)
      assert(sidebar().getBoundingClientRect().left >= 0, 'Drawer no abre')
      assert(!sidebar().querySelector('a[href="/perfil"], a[href="/mensajes"]'), 'Drawer duplica accesos')
      await capture('menu-mobile')
      sidebar().querySelector('a[href="/documentos"]').click(); await pause(250)
      assert(sidebar().getBoundingClientRect().right < 0, 'Navegar no cierra drawer')
      document.querySelector('[aria-label="Abrir menú lateral"]').click(); await pause(250)
      document.querySelector('[aria-label="Cerrar menú lateral"]').click(); await pause(250)
      assert(sidebar().getBoundingClientRect().right < 0, 'Overlay no cierra drawer')
    } else {
      document.querySelector('[aria-label="Cerrar barra lateral"]').click(); await pause(250); noOverflow()
      assert(sidebar().getBoundingClientRect().width < 100, 'Sidebar no colapsa')
      document.querySelector('[aria-label="Abrir barra lateral"]').click(); await pause(250)
    }
    document.querySelector('#long-identity').click(); await pause(50); noOverflow()
    assert(identity.textContent.includes('Administrador Producción'), 'Rol largo no disponible')
    await capture('identidad-larga')
    document.querySelector('#deny-messages').click(); await waitFor(() => !bell() && !link('Bandeja de mensajes'))
    assert(link('Mi perfil'), 'Permiso de mensajes afecta perfil')
    const before = calls.length
    window.dispatchEvent(new Event('messages:changed')); await pause(50)
    assert(calls.length === before, 'Sigue consultando notificaciones sin permiso')
    document.querySelector('#deny-profile').click(); await waitFor(() => !link('Mi perfil'))
    assert(!actions().querySelector('a, button'), 'Acciones visibles sin permisos')
    button('Cerrar sesión').click(); await waitFor(() => document.querySelector('[role="dialog"]'))
    await waitFor(() => document.activeElement === button('Cancelar'))
    await waitFor(() => getComputedStyle(document.querySelector('[role="dialog"]')).opacity === '1')
    await pause(350) // Wait for the existing Bootstrap enter transition before interacting.
    button('Cancelar').click(); await waitFor(() => !document.querySelector('[role="dialog"]'))
    assert(!window.logoutCalls, 'Cancelar cerró sesión')
    button('Cerrar sesión').click(); await waitFor(() => document.querySelector('[role="dialog"]'))
    await waitFor(() => document.activeElement === button('Cancelar'))
    await waitFor(() => getComputedStyle(document.querySelector('[role="dialog"]')).opacity === '1')
    await pause(350)
    const confirmLogout = [...document.querySelectorAll('[role="dialog"] button')].find(item => item.textContent === 'Cerrar sesión')
    confirmLogout.click()
    await waitFor(() => window.logoutCalls === 1)
    noOverflow()
    window.layoutTest = { status: 'passed', width: innerWidth, calls }
  } catch (error) { window.layoutTest = { status: 'failed', message: error.message, stack: error.stack, width: innerWidth,
    dialogs: [...document.querySelectorAll('[role="dialog"]')].map(element => ({ className: element.className,
      display: getComputedStyle(element).display, opacity: getComputedStyle(element).opacity, text: element.textContent })) } }
}
run()
