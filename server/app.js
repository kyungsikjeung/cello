import cors from '@fastify/cors'
import Fastify from 'fastify'
import { registerAuthRoutes } from './http/auth-handler.js'
import { registerPlatformRoutes } from './http/platform-routes.js'

export async function createApp({ config, pool, authPool, auth }) {
  const app = Fastify({
    logger: config.nodeEnv !== 'test',
    trustProxy: config.authTrustedProxies,
  })

  await app.register(cors, {
    origin: config.clientOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86_400,
  })

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

  registerAuthRoutes(app, auth)
  registerPlatformRoutes(app, {
    auth,
    pool,
    runtimeRole: config.runtimeRole,
  })

  return app
}
