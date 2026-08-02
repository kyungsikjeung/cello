const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function withActorTransaction(pool, { actorId }, operation) {
  if (!UUID_PATTERN.test(actorId)) {
    throw new TypeError('actorId must be a UUID')
  }

  const client = await pool.connect()
  let releaseError

  try {
    await client.query('begin')
    await client.query('set local role app_runtime')
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
