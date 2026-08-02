import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { loadMigrationConfig } from '../config.js'

const { Pool } = pg
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const migrationsDirectory = path.resolve(scriptDirectory, '../../db/migrations')

export function migrationChecksum(sql) {
  return createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex')
}

export async function migrateDatabase(config = loadMigrationConfig()) {
  const pool = new Pool({ connectionString: config.migrationDatabaseUrl, max: 1 })
  let client
  let lockAcquired = false
  let operationError

  try {
    client = await pool.connect()
    await client.query('select pg_advisory_lock($1, $2)', [20_260_802, 1])
    lockAcquired = true
    await client.query(`
      create table if not exists public.app_schema_migrations (
        name text primary key,
        checksum text not null,
        applied_at timestamptz not null default now()
      )
    `)

    const migrationFiles = (await readdir(migrationsDirectory))
      .filter((name) => name.endsWith('.sql'))
      .sort()

    for (const name of migrationFiles) {
      const sql = await readFile(path.join(migrationsDirectory, name), 'utf8')
      const checksum = migrationChecksum(sql)
      const existing = await client.query(
        'select checksum from public.app_schema_migrations where name = $1',
        [name],
      )

      if (existing.rowCount) {
        if (existing.rows[0].checksum !== checksum) {
          throw new Error(`Applied migration changed: ${name}`)
        }
        continue
      }

      await client.query('begin')
      try {
        await client.query(sql)
        await client.query(
          'insert into public.app_schema_migrations (name, checksum) values ($1, $2)',
          [name, checksum],
        )
        await client.query('commit')
        process.stdout.write(`Applied ${name}\n`)
      } catch (error) {
        try {
          await client.query('rollback')
        } catch (rollbackError) {
          throw new AggregateError([error, rollbackError], `migration rollback failed: ${name}`)
        }
        throw error
      }
    }
  } catch (error) {
    operationError = error
    throw error
  } finally {
    let cleanupError

    if (client) {
      try {
        if (lockAcquired) {
          await client.query('select pg_advisory_unlock($1, $2)', [20_260_802, 1])
        }
      } catch (error) {
        cleanupError = error
      } finally {
        client.release(cleanupError)
      }
    }

    await pool.end()
    if (cleanupError && !operationError) throw cleanupError
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  migrateDatabase().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
