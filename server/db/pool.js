import pg from 'pg'

const { Pool } = pg

export function createDatabasePool(connectionString) {
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  })
}
