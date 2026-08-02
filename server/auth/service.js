import { betterAuth } from 'better-auth'
import pg from 'pg'
import { authDatabaseModel } from './model.js'

const { Pool } = pg

export function createAuth(config) {
  const authPool = new Pool({
    connectionString: config.authDatabaseUrl,
    options: '-c search_path=app_auth',
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  })

  const auth = betterAuth({
    appName: 'Site Builder',
    baseURL: config.authBaseUrl,
    secret: config.authSecret,
    trustedOrigins: [config.clientOrigin],
    database: authPool,
    ...authDatabaseModel,
    advanced: {
      ...authDatabaseModel.advanced,
      ipAddress: {
        ipAddressHeaders: ['x-app-client-ip'],
      },
    },
  })

  return { auth, authPool }
}
