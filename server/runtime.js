import { createApp } from './app.js'
import { createAuth } from './auth/service.js'
import { loadRuntimeConfig } from './config.js'
import { verifyDatabaseBoundaries } from './db/boundaries.js'
import { createDatabasePool } from './db/pool.js'

const defaultDependencies = {
  createApp,
  createAuth,
  createDatabasePool,
  verifyDatabaseBoundaries,
}

export async function createServerRuntime(
  config = loadRuntimeConfig(),
  dependencyOverrides = {},
) {
  const dependencies = { ...defaultDependencies, ...dependencyOverrides }
  let platformPool
  let authPool

  try {
    platformPool = dependencies.createDatabasePool(config.databaseUrl)
    const authService = dependencies.createAuth(config)
    authPool = authService.authPool

    await dependencies.verifyDatabaseBoundaries({ platformPool, authPool })
    const app = await dependencies.createApp({
      config,
      pool: platformPool,
      authPool,
      auth: authService.auth,
    })

    app.addHook('onClose', async () => {
      await Promise.all([platformPool.end(), authPool.end()])
    })

    return { app, config }
  } catch (error) {
    await Promise.allSettled([platformPool?.end?.(), authPool?.end?.()])
    throw error
  }
}

export async function startServer(options = {}) {
  const runtime = await createServerRuntime(options.config, options.dependencies)

  try {
    await runtime.app.listen({ host: runtime.config.host, port: runtime.config.port })
    return runtime
  } catch (error) {
    await runtime.app.close()
    throw error
  }
}

export function createShutdown(app) {
  let closePromise
  return () => {
    closePromise ??= app.close()
    return closePromise
  }
}
