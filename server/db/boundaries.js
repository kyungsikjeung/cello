async function assertRole(pool, expectedRole) {
  const result = await pool.query(`
    select db_role.rolname as role_name,
           db_role.rolsuper,
           db_role.rolbypassrls,
           exists (
             select 1 from pg_auth_members where member = db_role.oid
           ) as has_memberships
      from pg_roles as db_role
     where db_role.rolname = current_user
  `)
  const role = result.rows[0]

  if (
    role?.role_name !== expectedRole ||
    role.rolsuper !== false ||
    role.rolbypassrls !== false ||
    role.has_memberships !== false
  ) {
    throw new Error(`Unsafe database connection: expected ${expectedRole}`)
  }
}

export async function verifyDatabaseBoundaries({ platformPool, authPool }) {
  await Promise.all([
    assertRole(platformPool, 'app_runtime'),
    assertRole(authPool, 'app_auth_runtime'),
  ])
  await authPool.query('select 1 from app_auth.users limit 0')
}
