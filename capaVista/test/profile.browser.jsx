import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import '../src/styles/global.css'
import '../src/styles/bootstrap-overrides.css'
import '../src/styles/theme.css'
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Context } from '@auth0/auth0-react'
import { AuthContext } from '../src/app/providers/authContext'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AppLayout from '../src/shared/components/layout/AppLayout'
import ProfilePage from '../src/modules/profile/pages/ProfilePage'
import UserMovementsModal from '../src/modules/users/components/UserMovementsModal'

const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const assert = (condition, message) => { if (!condition) throw new Error(message) }
async function waitFor(predicate) { for (let i = 0; i < 120; i++) { if (predicate()) return; await pause(25) } throw new Error('La consulta no terminó') }
const movements = Array.from({ length: 25 }, (_, index) => ({ id: 425 - index,
  detail: index % 2 ? 'Etapa del pedido: Producción' : 'Estado de pago: Confirmado', dateTime: '2026-09-28T17:32:00Z' }))
let historyMode = 'success', profileMode = 'failure', backendPin = 'active', historyCalls = 0, recoveryCalls = 0, profileCalls = 0
let adminCalls = 0
const queries = []
const originalFetch = window.fetch
const origin = new URL(import.meta.env.VITE_API_BASE_URL).origin
window.fetch = async (url, options = {}) => {
  if (!String(url).startsWith(origin)) return originalFetch(url, options)
  assert(new Headers(options.headers).get('Authorization') === 'Bearer test-token', 'Sin token')
  const parsed = new URL(url)
  const path = parsed.pathname
  if (path === '/api/auth/profile') {
    profileCalls++
    await pause(profileMode === 'slow' ? 800 : 100)
    if (profileMode === 'failure') return Response.json({ message: 'Fallo controlado de perfil.' }, { status: 503 })
    return Response.json({ primerNombre: 'Camila', apellidoPaterno: 'Pérez', email: 'camila@example.invalid',
      rutUsuario: '11.111.111-1', rolUsuario: 'Operario Ventas', estadoUsuario: 'Activo', records: movements.slice(0, 10) })
  }
  if (path === '/api/auth/profile/movements') {
    historyCalls++
    const query = Object.fromEntries(parsed.searchParams); queries.push(query)
    const mode = historyMode
    await pause(mode === 'slow' ? 700 : 120)
    if (mode === 'failure') return Response.json({ message: 'Fallo controlado de historial.' }, { status: 503 })
    if (mode === 'network') throw new TypeError('offline')
    const records = mode === 'empty' ? [] : movements.filter(record => !query.search || String(record.id) === query.search || record.detail.includes(query.search))
    const page = Number(query.page), perPage = Number(query.perPage)
    return Response.json({ records: records.slice((page - 1) * perPage, page * perPage), total: records.length, page, perPage })
  }
  if (path.endsWith('/pin-recovery/request')) { recoveryCalls++; await pause(150); return Response.json({ message: 'Enviado' }) }
  if (path.endsWith('/pin-recovery/confirm')) {
    assert(JSON.parse(options.body).code === '123456', 'Código alterado')
    backendPin = 'pending_acknowledgement'; return Response.json({})
  }
  if (path.endsWith('/pin/reveal')) return Response.json({ pin: '654321' })
  if (path.endsWith('/pin/acknowledge')) { backendPin = 'active'; return Response.json({}) }
  if (path.endsWith('/messages/notifications')) return Response.json({ notifications: [], unreadCount: 0 })
  throw new Error(`Ruta inesperada: ${path}`)
}

const auth0 = { user: { sub: 'auth0|profile-test' }, getAccessTokenSilently: async () => 'test-token' }
export function App() {
  const [pinStatus, setPinStatus] = useState('active')
  const [showAdmin, setShowAdmin] = useState(false)
  const auth = { user: { sub: 'auth0|profile-test', email: 'camila@example.invalid', primerNombre: 'Camila', apellidoPaterno: 'Pérez', rolUsuario: 'Operario Ventas', rutUsuario: '11.111.111-1', estadoUsuario: 'Activo' },
    isAuthenticated: true, authStatus: 'authenticated', hasPermission: () => true, hasRole: () => false, pinStatus,
    refreshSession: async () => { setPinStatus(backendPin) }, logout() {} }
  return <Auth0Context.Provider value={auth0}><AuthContext.Provider value={auth}>
    <MemoryRouter initialEntries={['/perfil']}><Routes><Route element={<AppLayout />}><Route path="perfil" element={<ProfilePage />} /></Route></Routes></MemoryRouter>
    <button hidden id="admin-test-open" type="button" onClick={() => setShowAdmin(true)}>Prueba administrativa</button>
    {showAdmin && <UserMovementsModal user={{ idUsuarioAutenticacionExterna: 'auth0|other', nombreCompleto: 'Usuario de prueba' }}
      api={{ async getMovements(subject, query) { adminCalls++; assert(subject === 'auth0|other', 'Adaptación administrativa rota'); return { records: movements.slice(0, query.perPage), total: 25, ...query } } }}
      onClose={() => setShowAdmin(false)} />}
  </AuthContext.Provider></Auth0Context.Provider>
}
createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
const findButton = (label, root = document) => [...root.querySelectorAll('button')].find(button => button.textContent.trim() === label)
const modal = () => document.querySelector('dialog[open]')
const rows = (root = document) => [...root.querySelectorAll('table tbody tr')]
const noOverflow = () => assert(document.documentElement.scrollWidth <= innerWidth + 1, `Overflow en ${innerWidth}px`)
function input(element, value) {
  Object.getOwnPropertyDescriptor(element.constructor.prototype, 'value').set.call(element, value)
  element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }))
}
async function closeHistory() { document.querySelector('[aria-label="Cerrar historial"]').click(); await waitFor(() => !modal()) }
async function openHistory() { const trigger = findButton('Ver historial completo'); trigger.focus(); trigger.click(); await waitFor(modal) }
window.profileTest = { status: 'running' }
async function run() {
  try {
    await waitFor(() => document.querySelector('[role="alert"]'))
    assert(profileCalls === 1, 'StrictMode duplicó consulta de perfil')
    assert(findButton('Ver historial completo').disabled, 'Historial habilitado sin perfil')
    profileMode = 'slow'; findButton('Reintentar').click(); await pause(50)
    assert(document.querySelector('dl').textContent.includes('11.111.111-1'), 'Datos verificados esperan a actividad lenta')
    assert(document.querySelector('main').textContent.includes('Camila Pérez'), 'No muestra identidad mientras consulta actividad')
    await waitFor(() => rows().length === 10)
    assert(profileCalls === 2, 'Reintento no realiza una única consulta nueva')
    profileMode = 'success'
    assert(document.querySelector('main').textContent.includes('Camila Pérez'), 'Nombre no real')
    assert(document.querySelector('dl').textContent.includes('11.111.111-1'), 'RUT perdido')
    assert(document.querySelector('dl').textContent.includes('No informada'), 'Fecha de registro inventada')
    assert(historyCalls === 0, 'Historial se precarga sin apertura')
    const hero = document.querySelector('#profile-title').parentElement
    assert(getComputedStyle(hero).backgroundColor === 'rgb(8, 8, 8)', 'Banner no oscuro')
    noOverflow(); window.profileCapture = 'perfil'; await pause(400)
    const roleContent = [...document.querySelectorAll('h3')].find(heading => heading.textContent === 'Rol del usuario').parentElement.parentElement
    const roleRect = roleContent.getBoundingClientRect(), area = roleContent.parentElement.getBoundingClientRect()
    assert(Math.abs((roleRect.top - area.top) - (area.bottom - roleRect.bottom)) < 2, 'Rol no centrado verticalmente')
    await openHistory(); await waitFor(() => rows(modal()).length === 10)
    assert(queries[0].page === '1' && queries[0].perPage === '10' && !('userId' in queries[0]), 'Contrato de identidad/paginación incorrecto')
    assert(!modal().querySelector('select') && !modal().textContent.includes('Registros por página'), 'Selector de registros permanece')
    assert(modal().querySelector('time').textContent.includes('14:32'), 'Hora de Chile incorrecta')
    const rect = modal().getBoundingClientRect()
    assert(rect.left >= 0 && rect.right <= innerWidth + 1 && rect.top >= 0 && rect.bottom <= innerHeight + 1, 'Modal fuera de pantalla')
    assert(modal().scrollWidth <= modal().clientWidth + 1, 'Modal tiene overflow horizontal')
    window.profileCapture = 'historial'; await pause(400)
    findButton('Siguiente', modal()).click(); await waitFor(() => modal()?.querySelector('[aria-current="page"]')?.textContent === '2')
    await waitFor(() => rows(modal()).length === 10)
    assert(rows(modal())[0].textContent.includes('415'), 'Paginación no carga siguiente bloque')
    input(modal().querySelector('input[type="search"]'), '425'); await pause(20)
    findButton('Buscar', modal()).click(); await waitFor(() => rows(modal()).length === 1)
    assert(queries.at(-1).search === '425', 'Búsqueda no va al servidor')
    findButton('Limpiar filtros', modal()).click(); await waitFor(() => rows(modal()).length === 10)
    await closeHistory(); assert(document.activeElement === findButton('Ver historial completo'), 'Foco no restaurado')
    historyMode = 'failure'; await openHistory(); await waitFor(() => modal()?.querySelector('[role="alert"]'))
    historyMode = 'success'; findButton('Reintentar', modal()).click(); await waitFor(() => rows(modal()).length === 10)
    await closeHistory()
    historyMode = 'network'; await openHistory(); await waitFor(() => modal()?.querySelector('[role="alert"]'))
    await closeHistory()
    historyMode = 'empty'; await openHistory(); await waitFor(() => modal()?.textContent.includes('No existen movimientos'))
    await closeHistory()
    historyMode = 'slow'; await openHistory(); await pause(30); await closeHistory()
    historyMode = 'success'; await openHistory(); await waitFor(() => rows(modal()).length === 10)
    await pause(750); assert(rows(modal()).length === 10, 'Respuesta tardía afecta modal reabierto')
    const cancelEvent = new Event('cancel', { cancelable: true }); modal().dispatchEvent(cancelEvent); await waitFor(() => !modal())
    findButton('Recuperar PIN').click(); await waitFor(() => document.querySelector('#pin-recovery-title'))
    findButton('Generar codigo').click(); await pause(20)
    assert(findButton('Generar codigo').disabled, 'Recuperación no bloquea durante envío')
    await waitFor(() => document.querySelector('input[inputmode="numeric"]'))
    input(document.querySelector('input[inputmode="numeric"]'), '123456'); await pause(20); findButton('Validar codigo').click()
    await waitFor(() => document.querySelector('#pin-delivery-title'))
    await waitFor(() => document.querySelector('.font-monospace').textContent === '654321')
    assert(findButton('Ver historial completo').disabled, 'PIN pendiente no bloquea historial')
    findButton('Aceptar').click(); await waitFor(() => !document.querySelector('#pin-delivery-title'))
    assert(recoveryCalls === 1 && !document.querySelector('main').textContent.includes('654321'), 'PIN permanece expuesto')
    document.querySelector('#admin-test-open').click(); await waitFor(() => modal()?.textContent.includes('Movimientos de usuario'))
    await waitFor(() => rows(modal()).length === 10); assert(adminCalls > 0, 'Modal administrativo roto')
    await closeHistory(); noOverflow()
    window.profileTest = { status: 'passed', width: innerWidth, historyCalls, recoveryCalls }
  } catch (error) { window.profileTest = { status: 'failed', message: error.message, width: innerWidth } }
}
run()
