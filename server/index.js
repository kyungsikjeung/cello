import { createApp } from './app.js'
import { createAuth } from './auth/service.js'
import { loadServerConfig } from './config.js'
import { verifyDatabaseBoundaries } from './db/boundaries.js'
import { createDatabasePool } from './db/pool.js'

const config = loadServerConfig()
const pool = createDatabasePool(config.databaseUrl)
const { auth, authPool } = createAuth(config)
let app

try {
  await verifyDatabaseBoundaries({ platformPool: pool, authPool })
  app = await createApp({ config, pool, authPool, auth })

  app.addHook('onClose', async () => {
    await Promise.all([pool.end(), authPool.end()])
  })
  await app.listen({ host: config.host, port: config.port })
} catch (error) {
  if (app) {
    app.log.error(error)
    await app.close()
  } else {
    console.error(error)
    await Promise.allSettled([pool.end(), authPool.end()])
  }
  process.exitCode = 1
}
