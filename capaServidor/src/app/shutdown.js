export function registerShutdown(server, disconnect, { timeoutMs = 10_000 } = {}) {
  let shuttingDown = false;
  async function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    const deadline = setTimeout(() => {
      server.closeAllConnections();
      process.exit(1);
    }, timeoutMs);
    deadline.unref();
    try {
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      await disconnect();
      clearTimeout(deadline);
      process.exit(0);
    } catch {
      console.error('Fallo el cierre ordenado del servidor.');
      process.exit(1);
    }
  }
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
