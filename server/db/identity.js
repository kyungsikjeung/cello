export async function resolveIdentity(pool, user) {
  const result = await pool.query(
    `select id
       from app_private.resolve_identity($1, $2, $3)`,
    [user.id, user.email, user.name],
  )

  if (!result.rows[0]?.id) {
    throw new Error('identity_resolution_failed')
  }

  return result.rows[0].id
}
