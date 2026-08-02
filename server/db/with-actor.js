const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ROLE_PATTERN = /^[a-z_][a-z0-9_]*$/i

export async function withActorTransaction(pool, { actorId, runtimeRole = 'app_runtime' }, operation) {
  if (!UUID_PATTERN.test(actorId)) {
    throw new TypeError('actorId must be a UUID')
  }

  if (!ROLE_PATTERN.test(runtimeRole)) {
    throw new TypeError('runtimeRole is invalid')
  }

  const client = await pool.connect()
  let releaseError

  try {
    await client.query('begin')
    await client.query(`set local role ${runtimeRole}`)
    await client.query("select set_config('app.user_id', $1, true)", [actorId])
    const result = await operation(client)
    await client.query('commit')
    return result
  } catch (error) {
    try {
      await client.query('rollback')
    } catch (rollbackError) {
      releaseError = rollbackError
      throw new AggregateError([error, rollbackError], 'transaction and rollback failed')
    }
    throw error
  } finally {
    client.release(releaseError)
  }
}
