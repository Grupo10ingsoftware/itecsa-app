import { createServer } from 'vite'

const server = await createServer({
  // SSR assertions use fixtures and must not depend on a developer's .env.
  envDir: false,
  server: { middlewareMode: true, ws: false, hmr: false },
  appType: 'custom',
  define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify('http://localhost:3000/api') },
})

try {
  const metrics = await server.ssrLoadModule('/test/metrics.cases.jsx')
  metrics.run()
  const authorization = await server.ssrLoadModule('/test/authorization.cases.jsx')
  const payments = await server.ssrLoadModule('/test/payment.cases.jsx')

  const profile = await server.ssrLoadModule('/test/profile.cases.jsx')
  const orders = await server.ssrLoadModule('/test/orders.cases.jsx')
  const kanbanDetail = await server.ssrLoadModule('/test/kanbanDetail.cases.jsx')
  const p07Api = await server.ssrLoadModule('/test/p07Api.cases.js')
  const kanbanOrderSummary = await server.ssrLoadModule('/test/kanbanOrderSummary.cases.jsx')

  const apiErrors = await server.ssrLoadModule('/test/apiErrors.cases.js')
  await apiErrors.run()

  const orderCreate = await server.ssrLoadModule('/test/orderCreatePayload.cases.js')
  orderCreate.run()

  profile.run()
  authorization.run()
  payments.run()
  orders.run()
  kanbanDetail.run()
  kanbanOrderSummary.run()
  await p07Api.run()
} finally {
  await server.close()
}
