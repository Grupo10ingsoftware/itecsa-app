import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'

const executable = [process.env.ITECSA_BROWSER_BIN, '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].filter(Boolean).find(existsSync)
if (!executable) throw new Error('Configura ITECSA_BROWSER_BIN con un navegador Chromium para esta prueba.')
const profile = await mkdtemp(join(tmpdir(), 'itecsa-privacy-browser-'))
const screenshots = await mkdtemp(join(tmpdir(), 'itecsa-privacy-screens-'))
const server = await createServer({ server: { host: '127.0.0.1', port: 0, hmr: false }, define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('http://privacy-test.invalid/api') } })
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
  for (const width of [320, 390, 768, 1440]) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 768 }, sessionId)
    await send('Page.enable', {}, sessionId)
    await send('Page.navigate', { url: `http://127.0.0.1:${server.httpServer.address().port}/test/privacy.browser.html` }, sessionId)
    let result
    const captured = new Set()
    for (let poll = 0; poll < 100; poll++) {
      const value = await send('Runtime.evaluate', { expression: '({ test: window.privacyTest, capture: window.privacyCapture })', returnByValue: true }, sessionId)
      result = value.result?.value?.test
      const capture = value.result?.value?.capture
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
    console.log(`Privacidad ${width}px: navegación, validación, envío/error/red, duplicados, tarjetas, responsive y cierre de sesión OK`)
    await send('Target.closeTarget', { targetId })
  }
  console.log(`Capturas de comprobación: ${screenshots}`)
} finally {
  socket?.close()
  browser?.kill()
  await server.close()
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}
