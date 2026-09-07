import { createServer } from 'vite'

const server = await createServer({
  server: { middlewareMode: true, ws: false, hmr: false },
  appType: 'custom',
})

try {
  const authorization = await server.ssrLoadModule('/test/authorization.cases.jsx')
  const payments = await server.ssrLoadModule('/test/payment.cases.jsx')

  authorization.run()
  payments.run()
} finally {
  await server.close()
}
