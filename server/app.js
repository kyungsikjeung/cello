import cors from '@fastify/cors'
import Fastify from 'fastify'
import { registerAuthenticationRoutes } from './auth/routes.js'
import { registerHealthRoutes } from './routes/health.js'
import { registerPlatformRoutes } from './routes/platform.js'

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

  registerHealthRoutes(app, { pool, authPool })
  registerAuthenticationRoutes(app, auth)
  registerPlatformRoutes(app, {
    auth,
    pool,
    runtimeRole: config.runtimeRole,
  })

  return app
}
