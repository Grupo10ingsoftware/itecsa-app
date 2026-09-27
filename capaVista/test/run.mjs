import { createServer } from 'vite'

const server = await createServer({
  // SSR assertions use fixtures and must not depend on a developer's .env.
  envDir: false,
  define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('https://api.example.test/api') },
  server: { middlewareMode: true, ws: false, hmr: false },
  appType: 'custom',
})

try {
  const authorization = await server.ssrLoadModule('/test/authorization.cases.jsx')
  const payments = await server.ssrLoadModule('/test/payment.cases.jsx')

  const profile = await server.ssrLoadModule('/test/profile.cases.jsx')
  const orders = await server.ssrLoadModule('/test/orders.cases.jsx')

  profile.run()
  authorization.run()
  payments.run()
  orders.run()
} finally {
  await server.close()
}
