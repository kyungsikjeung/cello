import { createShutdown, startServer } from './runtime.js'

try {
  const { app } = await startServer()
  const shutdown = createShutdown(app)

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      app.log.info({ signal }, 'shutdown requested')
      shutdown().catch((error) => {
        app.log.error(error, 'graceful shutdown failed')
        process.exitCode = 1
      })
    })
  }
} catch (error) {
  console.error(error)
  process.exitCode = 1
}
