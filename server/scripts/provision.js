import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { loadServerConfig } from '../config.js'

const { Pool } = pg

function parseRoleCredentials(connectionString, expectedRole) {
  const url = new URL(connectionString)
  const username = decodeURIComponent(url.username)
  const password = decodeURIComponent(url.password)

  if (username !== expectedRole || !password) {
    throw new Error(`${expectedRole} URL must contain its role name and a password`)
  }

  return { role: expectedRole, password }
}

export async function provisionDatabaseRoles(config = loadServerConfig()) {
  if (!config.migrationDatabaseUrl) {
    throw new Error('DATABASE_MIGRATION_URL is required for role provisioning')
  }

  const roles = [
    parseRoleCredentials(config.databaseUrl, 'app_runtime'),
    parseRoleCredentials(config.authDatabaseUrl, 'app_auth_runtime'),
  ]
  const pool = new Pool({ connectionString: config.migrationDatabaseUrl, max: 1 })
  const client = await pool.connect()

  try {
    await client.query('begin')
    for (const { role, password } of roles) {
      const quoted = await client.query('select quote_literal($1) as value', [password])
      await client.query(`alter role ${role} login password ${quoted.rows[0].value}`)
    }
    await client.query('commit')
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  provisionDatabaseRoles().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
