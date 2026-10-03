import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const executable = [process.env.ITECSA_BROWSER_BIN, '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].filter(Boolean).find(existsSync)
if (!executable) throw new Error('Configura ITECSA_BROWSER_BIN con un navegador Chromium para esta prueba.')
const profile = await mkdtemp(join(tmpdir(), 'itecsa-privacy-browser-'))
const screenshots = await mkdtemp(join(tmpdir(), 'itecsa-privacy-screens-'))
const incidentRun = process.argv[2] === 'incidents'
const profileRun = process.argv[2] === 'profile'
const layoutRun = process.argv[2] === 'layout'
const performanceRun = process.argv[2]?.startsWith('forms-performance')
const baselinePerformance = process.argv[2] === 'forms-performance-baseline'
const page = layoutRun ? 'layout.browser.html' : profileRun ? 'profile.browser.html' : performanceRun ? 'formsPerformance.browser.html' : incidentRun ? 'incident.browser.html' : 'privacy.browser.html'
const resultKey = layoutRun ? 'layoutTest' : profileRun ? 'profileTest' : performanceRun ? 'formsPerformanceTest' : incidentRun ? 'incidentTest' : 'privacyTest'
const captureKey = layoutRun ? 'layoutCapture' : profileRun ? 'profileCapture' : incidentRun ? 'incidentCapture' : 'privacyCapture'
const server = await createServer({
  cacheDir: join(profile, 'vite-cache'),
  server: { host: '127.0.0.1', port: 0, hmr: false },
  define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('http://privacy-test.invalid/api'), 'import.meta.env.FORMS_PRELOAD_ENABLED': JSON.stringify(!baselinePerformance) },
  ...(baselinePerformance ? { resolve: { alias: [{ find: /^(?:.*\/)?informationPageLoaders(?:\.js)?$/, replacement: fileURLToPath(new URL('./informationPageLoaders.baseline.js', import.meta.url)) }] } } : {}),
  plugins: performanceRun ? [{
    name: 'controlled-form-module-latency',
    configureServer(vite) {
      vite.middlewares.use((req, _res, next) => {
        // Apply the same cold module transfer delay to all measured pages and both runs.
        if (/\/(DataRequestsPage|IncidentReportPage|ProfilePage)\.jsx(?:\?|$)/.test(req.url)) setTimeout(next, 1500)
        else next()
      })
    },
  }] : [],
})
let browser, socket
try {
  await server.listen()
  browser = spawn(executable, ['--headless=new', '--disable-gpu', '--disable-extensions', '--disable-background-networking', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'])
  browser.stdout.resume()
  const endpoint = await new Promise((resolve, reject) => {
    let output = ''
    const timeout = setTimeout(() => reject(new Error('No se inició el navegador')), 15000)
    browser.once('error', reject)
    browser.stderr.on('data', chunk => { output += chunk; const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (match) { clearTimeout(timeout); resolve(match[1]) } })
  })
  socket = new WebSocket(endpoint)
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  let sequence = 0
  const pending = new Map()
  socket.addEventListener('message', event => {
    const response = JSON.parse(event.data)
    if (!pending.has(response.id)) return
    const { resolve, reject, timeout } = pending.get(response.id)
    pending.delete(response.id); clearTimeout(timeout)
    if (response.error) reject(new Error(response.error.message)); else resolve(response.result)
  })
  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++sequence
      const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)) }, 10000)
      pending.set(id, { resolve, reject, timeout })
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
    })
  }
  for (const width of performanceRun ? [1440] : (layoutRun || incidentRun || profileRun) ? [320, 390, 768, 1024, 1280, 1440] : [320, 390, 768, 1440]) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 768 }, sessionId)
    await send('Page.enable', {}, sessionId)
    await send('Page.navigate', { url: `http://127.0.0.1:${server.httpServer.address().port}/test/${page}` }, sessionId)
    let result
    const captured = new Set()
    for (let poll = 0; poll < (performanceRun ? 180 : 100); poll++) {
      const value = await send('Runtime.evaluate', { expression: `({ test: window.${resultKey}, capture: window.${captureKey} })`, returnByValue: true }, sessionId)
      result = value.result?.value?.test
      const capture = value.result?.value?.capture
      if (layoutRun) {
        const keyboard = await send('Runtime.evaluate', { expression: 'window.layoutKeyboardCheck', returnByValue: true }, sessionId)
        const press = async (key, code, windowsVirtualKeyCode) => {
          await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode }, sessionId)
          await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode }, sessionId)
          await new Promise(resolve => setTimeout(resolve, 30))
        }
        if (keyboard.result?.value === 'profile') {
          await press('Enter', 'Enter', 13)
          await send('Runtime.evaluate', { expression: 'window.layoutKeyboardCheck = "done"' }, sessionId)
        } else if (keyboard.result?.value === 'bell') {
          await press(' ', 'Space', 32)
          const opened = await send('Runtime.evaluate', { expression: `!!document.querySelector('[aria-label="Notificaciones nuevas"]')`, returnByValue: true }, sessionId)
          assert(opened.result?.value, 'Space no abre notificaciones')
          await press(' ', 'Space', 32)
          await press('Tab', 'Tab', 9)
          await send('Runtime.evaluate', { expression: 'window.layoutKeyboardCheck = "done"' }, sessionId)
        }
      }
      if (incidentRun) {
        const picker = await send('Runtime.evaluate', { expression: 'window.incidentPickerCheck?.status', returnByValue: true }, sessionId)
        if (picker.result?.value === 'ready') {
          for (const position of ['left', 'center', 'right']) {
            const geometry = await send('Runtime.evaluate', { expression: `(() => {
              const input = document.querySelector('#incident-observed'); input.scrollIntoView({ block: 'center', behavior: 'instant' });
              const rect = input.getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
            })()`, returnByValue: true }, sessionId)
            const rect = geometry.result.value
            const offset = position === 'left' ? 5 : position === 'right' ? rect.width * 0.8 : rect.width / 2
            const point = { x: rect.x + offset, y: rect.y + rect.height / 2, button: 'left', clickCount: 1 }
            await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point }, sessionId)
            await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point }, sessionId)
            await new Promise(resolve => setTimeout(resolve, 100))
            if (position === 'center' && width === 1440) {
              const pickerScreenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }, sessionId)
              await writeFile(join(screenshots, `${width}-calendario.png`), Buffer.from(pickerScreenshot.data, 'base64'))
            }
            await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }, sessionId)
            await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }, sessionId)
            await send('Runtime.evaluate', { expression: `document.querySelector('#incident-observed').blur()` }, sessionId)
            await new Promise(resolve => setTimeout(resolve, 100))
          }
          await send('Runtime.evaluate', { expression: `window.incidentPickerCheck.status = 'done'; window.scrollTo({ top: 0, behavior: 'instant' })` }, sessionId)
        }
      }
      if (capture && !captured.has(capture)) {
        const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }, sessionId)
        await writeFile(join(screenshots, `${width}-${capture}.png`), Buffer.from(screenshot.data, 'base64'))
        captured.add(capture)
      }
      if (result?.status === 'failed' || result?.status === 'passed') break
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }, sessionId)
    await writeFile(join(screenshots, `${width}.png`), Buffer.from(screenshot.data, 'base64'))
    assert.equal(result?.status, 'passed', `${width}px: ${JSON.stringify(result)}`)
    if (performanceRun) {
      await writeFile(join(screenshots, 'forms-performance.json'), JSON.stringify(result, null, 2))
      console.log(JSON.stringify(result, null, 2))
    }
    console.log(`${layoutRun ? 'Header/sidebar: navegación, permisos, notificaciones, textos largos y responsive' : profileRun ? 'Perfil: datos, historial propio, búsqueda, paginación, errores, PIN y responsive' : performanceRun ? 'Comparación' : incidentRun ? 'Incidentes' : 'Privacidad'} ${width}px: OK`)
    await send('Target.closeTarget', { targetId })
  }
  console.log(`Capturas de comprobación: ${screenshots}`)
} finally {
  socket?.close()
  browser?.kill()
  await server.close()
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}
