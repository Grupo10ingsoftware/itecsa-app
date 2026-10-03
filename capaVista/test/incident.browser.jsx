import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import '../src/styles/global.css'
import '../src/styles/bootstrap-overrides.css'
import '../src/styles/theme.css'
import { createRoot } from 'react-dom/client'
import { Auth0Context } from '@auth0/auth0-react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { AuthContext } from '../src/app/providers/authContext'
import AppRouter from '../src/app/router'

const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const bodies = []
let attempts = 0, mode = 'failure', logoutCalls = 0, configurationMode = 'held'
const pendingConfigurations = []
const backendEmail = 'trabajador@example.test'
const apiBase = new URL(import.meta.env.VITE_API_BASE_URL).origin
const originalFetch = window.fetch
window.fetch = async (url, options = {}) => {
  if (!String(url).startsWith(apiBase)) return originalFetch(url, options)
  if (new Headers(options.headers).get('Authorization') !== 'Bearer test-token') throw new Error('Falta sesión')
  let body = { notifications: [], unreadCount: 0 }, status = 200
  if (String(url).endsWith('/incident-reports/config')) {
    const responseMode = configurationMode
    if (responseMode === 'held') await new Promise(resolve => pendingConfigurations.push(resolve))
    if (responseMode === 'error') { status = 503; body = { message: 'Fallo de configuración de prueba' } }
    else body = { reportsEnabled: mode !== 'disabled', contactEmail: backendEmail }
  }
  if (String(url).endsWith('/privacy/documents')) body = { documents: [], requestsEnabled: true, attachmentsEnabled: false }
  if (String(url).endsWith('/incident-reports')) {
    attempts++; bodies.push(JSON.parse(options.body)); await pause(160)
    if (mode === 'network') throw new TypeError('Red de prueba')
    if (mode === 'failure') { status = 503; body = { code: 'INCIDENT_DELIVERY_FAILED', message: 'Fallo controlado de remisión.' } }
    else body = { reportId: bodies.at(-1).reportId, status: 'sent', receivedAt: '2026-10-02T15:00:00Z', message: 'Reporte remitido al servicio de correo.' }
  }
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
const auth = { user: { email: 'token@example.test', primerNombre: 'Usuario', apellidoPaterno: 'Prueba', rolUsuario: 'Soporte' }, isAuthenticated: true, isLoading: false, authStatus: 'authenticated', pinStatus: 'pending_acknowledgement', hasPermission: () => true, hasRole: () => true, logout: () => { logoutCalls++ } }
const auth0 = { getAccessTokenSilently: async () => 'test-token' }
export function LocationProbe() { return <span hidden data-test-path={useLocation().pathname} /> }
createRoot(document.getElementById('root')).render(<Auth0Context.Provider value={auth0}><AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/reportar-incidente']}><LocationProbe /><AppRouter /></MemoryRouter></AuthContext.Provider></Auth0Context.Provider>)

const assert = (condition, message) => { if (!condition) throw new Error(message) }
async function waitFor(predicate) { for (let i = 0; i < 150; i++) { if (predicate()) return; await pause(25) } throw new Error('No terminó de cargar') }
function input(name, value) {
  const element = document.querySelector(`[name="${name}"]`)
  Object.getOwnPropertyDescriptor(element.constructor.prototype, 'value').set.call(element, value)
  element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }))
}
const form = () => document.querySelector('form')
const submit = () => form().dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))
const link = label => document.querySelector(`a[aria-label="${label}"]`)
async function showMenu() { if (innerWidth < 992 && !document.querySelector('[aria-label="Cerrar menú lateral"]')) { document.querySelector('[aria-label="Abrir menú lateral"]').click(); await pause(220) } }
async function navigate(label) { await showMenu(); link(label).click(); await pause(250) }
const noOverflow = () => assert(document.documentElement.scrollWidth <= innerWidth + 1, `Overflow en ${innerWidth}`)
window.incidentTest = { status: 'running' }
async function run() {
  try {
    await waitFor(() => document.querySelector('#incident-email'))
    assert(document.querySelector('h1').textContent === 'REPORTAR INCIDENTE', 'Encabezado incorrecto')
    await waitFor(() => pendingConfigurations.length === 1)
    const draftInput = document.querySelector('#incident-description')
    const initialForm = form()
    assert(!draftInput.disabled && document.querySelector('aside[aria-labelledby="incident-types-title"]'), 'Esperó configuración para mostrar formulario o panel')
    assert(document.querySelector('#incident-email').value === '' && form().querySelector('button[type="submit"]').disabled, 'Permite enviar sin confirmar correo/configuración')
    assert(form().textContent.includes('Comprobando disponibilidad') && !form().textContent.includes('pendiente de configuración'), 'Confunde carga con canal deshabilitado')
    input('description', 'Borrador escrito mientras responde el backend.')
    input('observedAt', '2026-10-01T12:00'); input('module', 'kanban'); input('technicalReference', 'Referencia pendiente')
    await pause(40); submit(); await pause(40)
    assert(attempts === 0 && !form().querySelector('[aria-invalid="true"]'), 'Intentó enviar durante la comprobación')
    // A backend held for two seconds cannot delay or remount the editable interface.
    await pause(2000)
    assert(draftInput.value.includes('mientras responde') && form() === initialForm, 'Pierde borrador durante una consulta lenta')
    configurationMode = 'normal'; pendingConfigurations.shift()()
    await waitFor(() => document.querySelector('#incident-email').value === backendEmail)
    assert(form() === initialForm && document.querySelector('#incident-description') === draftInput && draftInput.value.includes('mientras responde'), 'La confirmación remonta o borra el formulario')
    assert(document.querySelector('#incident-reference').value === 'Referencia pendiente' && !form().querySelector('button[type="submit"]').disabled, 'No conserva referencia o no habilita envío confirmado')
    for (const field of ['description', 'observedAt', 'module', 'technicalReference']) input(field, '')
    await pause(40)

    assert(document.querySelector('#incident-email').value === backendEmail && document.querySelector('#incident-email').readOnly, 'Correo no corresponde a identidad backend')
    assert(document.querySelector('#incident-observed').type === 'datetime-local', 'No permite fecha y hora')
    const dateInput = document.querySelector('#incident-observed')
    const moduleInput = document.querySelector('#incident-module')
    const dateRect = dateInput.getBoundingClientRect(), moduleRect = moduleInput.getBoundingClientRect()
    if (innerWidth >= 576) assert(Math.abs(dateRect.top - moduleRect.top) < 1, 'Fecha y módulo no están alineados')
    assert(Math.abs(dateRect.height - moduleRect.height) < 1, 'Fecha y módulo tienen alturas diferentes')
    const reviewIcon = document.querySelector('aside[aria-labelledby="incident-types-title"] .bi-shield-fill').parentElement
    const circle = reviewIcon.getBoundingClientRect()
    assert(Math.abs(circle.width - circle.height) < 1 && getComputedStyle(reviewIcon).borderRadius === '50%', 'Escudo no tiene un círculo')
    assert(getComputedStyle(reviewIcon).backgroundColor !== getComputedStyle(reviewIcon.parentElement).backgroundColor, 'Círculo del escudo no se distingue')
    const nativePicker = dateInput.showPicker
    window.incidentPickerCheck = { status: 'ready', calls: 0, errors: [] }
    dateInput.showPicker = function () {
      window.incidentPickerCheck.calls++
      try { return nativePicker.call(this) } catch (error) { window.incidentPickerCheck.errors.push(error.name); throw error }
    }
    await waitFor(() => window.incidentPickerCheck.status === 'done')
    assert(window.incidentPickerCheck.calls >= 3 && window.incidentPickerCheck.errors.length === 0, `No abre calendario desde todo el campo con clic real: ${JSON.stringify(window.incidentPickerCheck)}`)
    dateInput.showPicker = nativePicker

    assert(document.querySelectorAll('aside[aria-labelledby="incident-types-title"] li').length === 4, 'Categorías incompletas')
    assert(document.querySelector('aside[aria-labelledby="incident-types-title"]').textContent.includes('Tu reporte será revisado por el equipo de seguridad.'), 'Nota final ausente')
    const button = form().querySelector('button[type="submit"]')
    assert(getComputedStyle(button).backgroundColor === 'rgb(0, 0, 0)' && getComputedStyle(button).color === 'rgb(255, 255, 255)', 'Botón no es negro/blanco')
    assert(getComputedStyle(button.querySelector('i')).color === 'rgb(255, 255, 255)', 'Escudo no es blanco')
    noOverflow(); window.incidentCapture = 'incidente'; await pause(400)
    await showMenu()
    const docs = link('Documentos').getBoundingClientRect(), requests = link('Solicitudes').getBoundingClientRect()
    assert(Math.abs(docs.width - requests.width) < 1 && Math.abs(docs.height - requests.height) < 1, 'P18 perdió tamaños iguales')
    const incident = link('Reportar incidente').getBoundingClientRect(), logout = document.querySelector('[aria-label="Cerrar sesión"]').getBoundingClientRect()
    assert(incident.top >= docs.bottom && logout.top >= incident.bottom, 'Orden sidebar incorrecto')
    assert(Math.abs(incident.width - logout.width) < 1, 'Acceso no ocupa ancho de cerrar sesión')
    assert(link('Reportar incidente').getAttribute('aria-current') === 'page', 'Estado activo incorrecto')
    if (innerWidth < 992) { link('Reportar incidente').click(); await pause(250); assert(!document.querySelector('[aria-label="Cerrar menú lateral"]'), 'Drawer no cierra') }
    submit(); await pause(40)
    for (const id of ['incident-description', 'incident-observed', 'incident-module']) assert(document.getElementById(id).getAttribute('aria-invalid') === 'true', `No valida ${id}`)
    assert(attempts === 0, 'Envió campos vacíos')
    input('description', 'Consulta de seguridad ficticia.'); input('observedAt', '2099-01-01T12:00'); input('module', 'kanban'); await pause(40)
    submit(); await pause(40); assert(attempts === 0 && document.querySelector('#incident-observed').getAttribute('aria-invalid') === 'true', 'Aceptó fecha futura')
    input('observedAt', '2026-10-01T12:00'); await pause(40)
    Object.defineProperty(window.crypto, 'randomUUID', { configurable: true, value: undefined })
    submit(); submit(); await pause(40); assert(button.disabled, 'No bloquea envío')
    await waitFor(() => document.querySelector('[role="alert"]')?.textContent.includes('Fallo controlado'))
    assert(attempts === 1 && document.querySelector('#incident-description').value.includes('ficticia'), 'Duplicó o perdió contenido')
    for (const field of ['userId', 'email', 'role', 'recipient']) assert(!(field in bodies[0]), `Payload incluye ${field}`)
    assert(bodies[0].observedAt === new Date('2026-10-01T12:00').toISOString(), 'Fecha no convertida a UTC')
    mode = 'success'; submit(); await waitFor(() => form().querySelector('[role="status"]')?.textContent.includes('Reporte remitido'))
    assert(bodies[0].reportId === bodies[1].reportId, 'Reintento genera duplicado')
    input('description', 'Segunda sospecha de prueba.'); input('observedAt', '2026-10-01T13:00'); input('module', 'authentication'); await pause(40)
    mode = 'network'; submit(); await waitFor(() => document.querySelector('[role="alert"]')?.textContent.includes('No pudimos confirmar'))
    assert(document.querySelector('#incident-description').disabled, 'Permite editar envío incierto')
    mode = 'success'; submit(); await waitFor(() => form().querySelector('[role="status"]')?.textContent.includes('Reporte remitido'))
    assert(JSON.stringify(bodies[2]) === JSON.stringify(bodies[3]), 'Reintento de red cambió payload')
    auth.pinStatus = undefined
    form().querySelector('button[type="button"]').click()
    await waitFor(() => document.querySelector('[data-test-path]')?.dataset.testPath === '/kanban')
    await navigate('Reportar incidente'); await waitFor(() => document.querySelector('#incident-email'))
    assert(document.querySelector('#incident-description').value === '', 'Cancelar no deja un formulario nuevo')
    await navigate('Documentos'); await waitFor(() => document.querySelectorAll('article').length === 4)
    assert(link('Documentos').getAttribute('aria-current') === 'page', 'Documentos no funciona')
    assert(getComputedStyle(link('Reportar incidente')).color === 'rgb(255, 255, 255)', 'Incidente inactivo no es blanco')
    await navigate('Solicitudes'); await waitFor(() => document.querySelector('#request-email'))
    assert(document.querySelector('h1').textContent === 'SOLICITUDES SOBRE MIS DATOS', 'Solicitudes no funciona')
    configurationMode = 'error'; await navigate('Reportar incidente')
    await waitFor(() => form()?.querySelector('[role="alert"]')?.textContent.includes('No fue posible comprobar'))
    const errorForm = form()
    assert(document.querySelector('aside[aria-labelledby="incident-types-title"]') && !document.querySelector('#incident-description').disabled, 'Error oculta o bloquea el formulario')
    input('description', 'Borrador conservado al reintentar configuración.'); await pause(40)
    submit(); await pause(40); assert(attempts === 4, 'Envió pese a fallo de configuración')
    configurationMode = 'held'; form().querySelector('[role="alert"] button').click()
    await waitFor(() => pendingConfigurations.length === 1)
    assert(form() === errorForm && form().textContent.includes('Comprobando disponibilidad') && !form().querySelector('[role="alert"]'), 'Reintentar no actualiza el estado o remonta el formulario')
    assert(document.querySelector('#incident-description').value.includes('conservado') && form().querySelector('button[type="submit"]').disabled, 'Reintentar borra borrador o permite enviar')
    configurationMode = 'normal'; pendingConfigurations.shift()()
    await waitFor(() => document.querySelector('#incident-email').value === backendEmail)
    assert(form() === errorForm && document.querySelector('#incident-description').value.includes('conservado'), 'Recuperación de configuración borra borrador')
    await navigate('Documentos'); await waitFor(() => document.querySelectorAll('article').length === 4)
    configurationMode = 'held'; await navigate('Reportar incidente'); await waitFor(() => pendingConfigurations.length === 1)
    await navigate('Documentos'); configurationMode = 'normal'
    await navigate('Reportar incidente'); await waitFor(() => document.querySelector('#incident-email')?.value === backendEmail)
    pendingConfigurations.shift()(); await pause(40)
    assert(!form().querySelector('button[type="submit"]').disabled && document.querySelector('#incident-description').value === '', 'Respuesta tardía afecta una pantalla nueva')
    await navigate('Documentos')
    mode = 'disabled'; await navigate('Reportar incidente'); await waitFor(() => form()?.textContent.includes('pendiente de configuración'))
    assert(form().querySelector('button[type="submit"]').disabled && form().textContent.includes('pendiente de configuración'), 'Canal deshabilitado simula envío')
    noOverflow(); await showMenu()
    if (innerWidth >= 992) {
      document.querySelector('[aria-label="Cerrar barra lateral"]').click()
      await waitFor(() => getComputedStyle(link('Reportar incidente').querySelector('span')).opacity === '0')
      assert(link('Reportar incidente').getBoundingClientRect().width > 30, 'Icono colapsado no accesible')
      document.querySelector('[aria-label="Abrir barra lateral"]').click(); await pause(250)
    }
    document.querySelector('[aria-label="Cerrar sesión"]').click(); await pause(100)
    const dialog = document.querySelector('[role="dialog"]'); assert(dialog, 'No abre cierre de sesión')
    ;[...dialog.querySelectorAll('button')].find(button => button.textContent.trim() === 'Cerrar sesión').click(); await pause(50)
    assert(logoutCalls === 1, 'No cierra sesión')
    window.incidentTest = { status: 'passed', width: innerWidth, attempts }
  } catch (error) { window.incidentTest = { status: 'failed', width: innerWidth, message: error.message } }
}
run()
