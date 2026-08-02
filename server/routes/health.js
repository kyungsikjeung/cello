export function registerHealthRoutes(app, { pool, authPool }) {
  app.get('/api/health/live', async () => ({ status: 'ok' }))

  app.get('/api/health/ready', async (_request, reply) => {
    try {
      await Promise.all([
        pool.query('select 1'),
        authPool.query('select 1 from app_auth.users limit 0'),
      ])
      return { status: 'ready' }
    } catch {
      return reply.status(503).send({ status: 'unavailable' })
    }
  })
}
