import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { loadProvisionConfig } from '../config.js'

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

export async function provisionDatabaseRoles(config = loadProvisionConfig()) {
  const roles = [
    parseRoleCredentials(config.databaseUrl, 'app_runtime'),
    parseRoleCredentials(config.authDatabaseUrl, 'app_auth_runtime'),
  ]
  const pool = new Pool({ connectionString: config.migrationDatabaseUrl, max: 1 })
  let client
  let transactionStarted = false
  let releaseError

  try {
    client = await pool.connect()
    await client.query('begin')
    transactionStarted = true
    for (const { role, password } of roles) {
      const quoted = await client.query('select quote_literal($1) as value', [password])
      await client.query(`alter role ${role} login password ${quoted.rows[0].value}`)
    }
    await client.query('commit')
    transactionStarted = false
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query('rollback')
      } catch (rollbackError) {
        releaseError = rollbackError
        throw new AggregateError([error, rollbackError], 'role provisioning rollback failed')
      }
    }
    throw error
  } finally {
    client?.release(releaseError)
    await pool.end()
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  provisionDatabaseRoles().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
