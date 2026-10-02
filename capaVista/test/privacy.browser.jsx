import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import '../src/styles/global.css'
import '../src/styles/bootstrap-overrides.css'
import '../src/styles/theme.css'
import { createRoot } from 'react-dom/client'
import { Auth0Context } from '@auth0/auth0-react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext } from '../src/app/providers/authContext'
import AppLayout from '../src/shared/components/layout/AppLayout'
import DocumentsPage from '../src/modules/privacy/pages/DocumentsPage'
import DataRequestsPage from '../src/modules/privacy/pages/DataRequestsPage'

const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
let attempts = 0
let mode = 'failure'
let logoutCalls = 0
const bodies = []
const apiBase = new URL(import.meta.env.VITE_API_BASE_URL).origin
const originalFetch = window.fetch
window.fetch = async (url, options = {}) => {
  if (!String(url).startsWith(apiBase)) return originalFetch(url, options)
  const headers = new Headers(options.headers)
  if (headers.get('Authorization') !== 'Bearer test-token') throw new Error('Sesión no enviada')
  let body = { notifications: [], unreadCount: 0 }
  let status = 200
  if (String(url).endsWith('/privacy/documents')) body = {
    documents: [{ id: 'notice', url: '/test/privacy.browser.html', version: 'prueba técnica' }, { id: 'terms', url: null }, { id: 'policy', url: null }, { id: 'procedure', url: null }], requestsEnabled: true, attachmentsEnabled: false,
  }
  if (String(url).endsWith('/privacy/requests')) {
    attempts++
    bodies.push(JSON.parse(options.body))
    await pause(150)
    if (mode === 'network') throw new TypeError('Red de prueba')
    if (mode === 'failure') { status = 503; body = { code: 'PRIVACY_DELIVERY_FAILED', message: 'Fallo controlado de correo.' } }
    else body = { requestId: bodies.at(-1).requestId, status: 'sent', receivedAt: '2026-10-02T15:00:00Z', message: 'Solicitud remitida al servicio de correo.' }
  }
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
const auth = { user: { email: 'trabajador@example.test', primerNombre: 'Usuario', apellidoPaterno: 'Prueba', rolUsuario: 'Soporte' }, isAuthenticated: true, authStatus: 'authenticated', hasPermission: () => true, hasRole: () => true, logout: () => { logoutCalls++ } }
const auth0 = { getAccessTokenSilently: async () => 'test-token' }
export function App() {
  return <Auth0Context.Provider value={auth0}><AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/solicitudes']}><Routes>
    <Route element={<AppLayout />}><Route path="solicitudes" element={<DataRequestsPage />} /><Route path="documentos" element={<DocumentsPage />} /><Route path="kanban" element={<p>Kanban de prueba</p>} /></Route>
  </Routes></MemoryRouter></AuthContext.Provider></Auth0Context.Provider>
}
createRoot(document.getElementById('root')).render(<App />)

const assert = (condition, message) => { if (!condition) throw new Error(message) }
async function waitFor(predicate) { for (let i = 0; i < 100; i++) { if (predicate()) return; await pause(25) } throw new Error('La pantalla no terminó de cargar') }
function input(name, value) {
  const element = document.querySelector(`[name="${name}"]`)
  Object.getOwnPropertyDescriptor(element.constructor.prototype, 'value').set.call(element, value)
  element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }))
}
function submit() { document.querySelector('form').dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true })) }
const sidebarLink = label => document.querySelector(`a[aria-label="${label}"]`)
async function showMenu() {
  if (innerWidth < 992) { document.querySelector('[aria-label="Abrir menú lateral"]').click(); await pause(100) }
}
function noOverflow() { assert(document.documentElement.scrollWidth <= innerWidth + 1, `Overflow horizontal en ${innerWidth}`) }

window.privacyTest = { status: 'running' }
async function run() {
  try {
    await waitFor(() => document.querySelector('#request-email'))
    window.privacyCapture = 'solicitudes'
    await pause(400)
    assert(document.querySelector('#request-email').value === auth.user.email, 'Correo no proviene de sesión')
    assert(document.querySelector('#request-email').readOnly, 'Contacto editable')
    assert(document.querySelector('#request-attachment').disabled, 'Adjunto no protegido')
    assert(document.querySelectorAll('aside[aria-labelledby="request-types-title"] li').length === 6, 'Tipos incompletos')
    assert(document.querySelector('#request-types-title').nextElementSibling.tagName === 'UL', 'Texto adicional bajo el título')
    assert(getComputedStyle(document.querySelector('#request-types-title i')).color === 'rgb(17, 17, 17)', 'Icono informativo no neutro')
    noOverflow()
    await showMenu()
    const a = sidebarLink('Documentos').getBoundingClientRect(), b = sidebarLink('Solicitudes').getBoundingClientRect()
    assert(Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1, 'Botones de distinto tamaño')
    assert(sidebarLink('Solicitudes').getAttribute('aria-current') === 'page', 'Estado activo incorrecto')
    assert(getComputedStyle(document.querySelector('[aria-label="Cerrar sesión"]')).color === 'rgb(255, 255, 255)', 'Cerrar sesión no tiene contraste')
    if (innerWidth < 992) { sidebarLink('Solicitudes').click(); await pause(100) }
    submit(); await pause(30)
    assert(document.querySelector('#request-type').getAttribute('aria-invalid') === 'true', 'No valida tipo')
    assert(attempts === 0, 'Envió formulario inválido')
    input('type', 'access'); input('subject', 'Consulta técnica'); input('description', 'Contenido de prueba.'); await pause(30)
    // Exercise browsers where randomUUID is unavailable (e.g. an internal HTTP origin).
    Object.defineProperty(window.crypto, 'randomUUID', { configurable: true, value: undefined })
    submit(); submit(); await pause(30)
    assert(document.querySelector('button[type="submit"]').disabled, 'No bloquea durante envío')
    await waitFor(() => document.querySelector('[role="alert"]')?.textContent.includes('Fallo controlado'))
    assert(attempts === 1, 'Doble submit envió más de una vez')
    assert(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(bodies[0].requestId), 'UUID de respaldo inválido')
    assert(document.querySelector('#request-description').value === 'Contenido de prueba.', 'Perdió descripción tras error')
    mode = 'success'; submit()
    await waitFor(() => document.querySelector('form [role="status"]')?.textContent.includes('Solicitud remitida'))
    assert(bodies[0].requestId === bodies[1].requestId, 'Reintento perdió identificador')
    assert(!('userId' in bodies[1]), 'El formulario permite elegir titular')
    input('type', 'blocking'); input('subject', 'Otra consulta'); input('description', 'Segunda prueba.'); await pause(30)
    mode = 'network'; submit()
    await waitFor(() => document.querySelector('[role="alert"]')?.textContent.includes('No pudimos confirmar'))
    assert(document.querySelector('#request-subject').disabled, 'Permite cambiar envío incierto')
    mode = 'success'; submit()
    await waitFor(() => document.querySelector('form [role="status"]')?.textContent.includes('Solicitud remitida'))
    assert(bodies[2].requestId === bodies[3].requestId, 'Reintento de red genera duplicado')
    await showMenu(); sidebarLink('Documentos').click()
    await waitFor(() => document.querySelectorAll('article').length === 4)
    await pause(250)
    assert(sidebarLink('Documentos').getAttribute('aria-current') === 'page', 'Documentos no queda activo')
    assert(document.querySelectorAll('article button[disabled]').length === 3, 'Documentos ausentes no indicados')
    assert(document.querySelector('article a').getAttribute('href') === '/test/privacy.browser.html', 'Enlace no resuelto')
    const cards = [...document.querySelectorAll('article')].map(card => card.getBoundingClientRect())
    assert(innerWidth < 768 ? cards[1].top > cards[0].bottom : Math.abs(cards[0].top - cards[1].top) < 1, 'Distribución de tarjetas incorrecta')
    noOverflow()
    window.privacyCapture = 'documentos'
    await pause(400)
    await showMenu()
    if (innerWidth >= 992) {
      document.querySelector('[aria-label="Cerrar barra lateral"]').click()
      await waitFor(() => getComputedStyle(sidebarLink('Documentos').querySelector('span')).opacity === '0')
      assert(getComputedStyle(sidebarLink('Documentos').querySelector('span')).opacity === '0', 'No colapsa etiqueta')
      assert(sidebarLink('Documentos').getBoundingClientRect().width > 30, 'Icono colapsado no accesible')
      document.querySelector('[aria-label="Abrir barra lateral"]').click(); await pause(100)
    }
    document.querySelector('[aria-label="Cerrar sesión"]').click(); await pause(100)
    const dialog = document.querySelector('[role="dialog"]')
    assert(dialog, 'No abre confirmación de cierre')
    const confirm = [...dialog.querySelectorAll('button')].find(button => button.textContent.trim() === 'Cerrar sesión')
    confirm.click(); await pause(50)
    assert(logoutCalls === 1, 'Cierre de sesión no funciona')
    window.privacyTest = { status: 'passed', width: innerWidth, attempts }
  } catch (error) { window.privacyTest = { status: 'failed', message: error.message, width: innerWidth } }
}
run()
