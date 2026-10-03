import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import '../src/styles/global.css'
import '../src/styles/bootstrap-overrides.css'
import '../src/styles/theme.css'
import { createRoot } from 'react-dom/client'
import { Auth0Context } from '@auth0/auth0-react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../src/app/providers/authContext'
import AppRouter from '../src/app/router'

const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
const apiBase = new URL(import.meta.env.VITE_API_BASE_URL).origin
const originalFetch = window.fetch
const calls = []
let delayMs = 0
window.fetch = async (url, options = {}) => {
  if (!String(url).startsWith(apiBase)) return originalFetch(url, options)
  if (options.method === 'POST') throw new Error('La comparación no debe enviar formularios')
  const path = new URL(url).pathname
  const call = { path, startedAt: performance.now(), completedAt: null }
  calls.push(call)
  const config = path.endsWith('/privacy/documents') || path.endsWith('/incident-reports/config')
  if (config && delayMs) await pause(delayMs)
  const body = path.endsWith('/privacy/documents') ? { documents: [], requestsEnabled: true, attachmentsEnabled: false }
    : path.endsWith('/incident-reports/config') ? { reportsEnabled: true, contactEmail: 'backend@example.test' }
      : { notifications: [], unreadCount: 0 }
  call.completedAt = performance.now()
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
}
const auth = { user: { email: 'sesion@example.test', primerNombre: 'Prueba', rolUsuario: 'Soporte' }, isAuthenticated: true, isLoading: false, authStatus: 'authenticated', pinStatus: 'pending_acknowledgement', hasPermission: () => true, hasRole: () => true, logout() {} }
const auth0 = { getAccessTokenSilently: async () => 'test-token' }
createRoot(document.getElementById('root')).render(<Auth0Context.Provider value={auth0}><AuthContext.Provider value={auth}><MemoryRouter initialEntries={['/documentos']}><AppRouter /></MemoryRouter></AuthContext.Provider></Auth0Context.Provider>)

const assert = (condition, message) => { if (!condition) throw new Error(message) }
async function waitFor(predicate) {
  for (let i = 0; i < 300; i++) { if (predicate()) return; await pause(10) }
  throw new Error('La comparación excedió el tiempo de espera')
}
const painted = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
const link = label => document.querySelector(`a[aria-label="${label}"]`)
async function documents() {
  delayMs = 0
  link('Documentos').click()
  await waitFor(() => document.querySelectorAll('article').length === 4)
  await painted()
}
async function measure(label, field, apiPath, latency) {
  await documents()
  const before = calls.length
  delayMs = latency
  const start = performance.now()
  link(label).click()
  await waitFor(() => document.querySelector(field))
  await painted()
  const visible = performance.now()
  const button = document.querySelector('form button[type="submit"]')
  const blockedWhenVisible = button.disabled
  await waitFor(() => calls.slice(before).some(call => call.path.endsWith(apiPath) && call.completedAt !== null))
  await waitFor(() => !document.querySelector('form button[type="submit"]').disabled)
  const ready = performance.now()
  const request = calls.slice(before).find(call => call.path.endsWith(apiPath))
  assert(calls.slice(before).filter(call => call.path.endsWith(apiPath)).length === 1, 'Duplicó consulta de configuración')
  if (label === 'Reportar incidente' && latency) {
    assert(visible < request.completedAt, 'El formulario de incidentes espera al backend')
    assert(blockedWhenVisible, 'Permite enviar antes de confirmar configuración')
  }
  return { page: label, simulatedApiDelayMs: latency, formVisibleMs: Math.round(visible - start),
    submitEnabledMs: Math.round(ready - start), apiDurationMs: Math.round(request.completedAt - request.startedAt),
    submitBlockedWhenVisible: blockedWhenVisible }
}
window.formsPerformanceTest = { status: 'running' }
async function run() {
  try {
    await waitFor(() => document.querySelectorAll('article').length === 4)
    // Give the mounted sidebar idle time; code preloading must not request private configuration.
    await pause(2500)
    assert(!calls.some(call => call.path.endsWith('/incident-reports/config')), 'Precarga consulta información privada sin visitar la página')
    const modules = performance.getEntriesByType('resource').filter(entry => /\/(DataRequestsPage|IncidentReportPage)\.jsx(?:\?|$)/.test(entry.name))
      .map(entry => ({ page: entry.name.includes('DataRequestsPage') ? 'Solicitudes' : 'Reportar incidente', downloadedBeforeClick: true }))
    if (import.meta.env.FORMS_PRELOAD_ENABLED) assert(modules.length === 2, 'No preparó ambos módulos antes de navegar')
    else assert(modules.length === 0, 'La referencia sin precarga descargó formularios anticipadamente')
    const results = []
    for (const latency of [0, 2000]) {
      results.push(await measure('Solicitudes', '#request-description', '/privacy/documents', latency))
      results.push(await measure('Reportar incidente', '#incident-description', '/incident-reports/config', latency))
    }
    window.formsPerformanceTest = { status: 'passed', preloadingEnabled: import.meta.env.FORMS_PRELOAD_ENABLED, simulatedColdModuleDelayMs: 1500, modulesPreparedBeforeClick: modules, results, environment: 'Vite dev local, Chromium headless, sesión/API sintéticas; no mide DB/Auth0 reales' }
  } catch (error) { window.formsPerformanceTest = { status: 'failed', message: error.message } }
}
run()
