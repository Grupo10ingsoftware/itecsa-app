import { createServer } from 'vite'

const server = await createServer({
  server: { middlewareMode: true, ws: false, hmr: false },
  appType: 'custom',
})

try {
  const authorization = await server.ssrLoadModule('/test/authorization.cases.jsx')
  const payments = await server.ssrLoadModule('/test/payment.cases.jsx')

  const profile = await server.ssrLoadModule('/test/profile.cases.jsx')

  const apiErrors = await server.ssrLoadModule('/test/apiErrors.cases.js')
  await apiErrors.run()

  const orderCreate = await server.ssrLoadModule('/test/orderCreatePayload.cases.js')
  orderCreate.run()

  profile.run()
  authorization.run()
  payments.run()
} finally {
  await server.close()
}
