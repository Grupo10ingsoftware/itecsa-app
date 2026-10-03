import { createServer } from 'vite'

const server = await createServer({
  server: { middlewareMode: true, ws: false, hmr: false },
  appType: 'custom',
  define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('http://localhost:3000/api') },
})

try {
  const metrics = await server.ssrLoadModule('/test/metrics.cases.jsx')
  metrics.run()
  const p07Api = await server.ssrLoadModule('/test/p07Api.cases.js')
  await p07Api.run()
} finally {
  await server.close()
}
