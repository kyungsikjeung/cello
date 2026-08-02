import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../../server/app.js'
import { createAuth } from '../../server/auth/service.js'
import { loadServerConfig } from '../../server/config.js'
import { verifyDatabaseBoundaries } from '../../server/db/boundaries.js'
import { createDatabasePool } from '../../server/db/pool.js'
import { withActorTransaction } from '../../server/db/with-actor.js'
import { migrateDatabase } from '../../server/scripts/migrate.js'
import { provisionDatabaseRoles } from '../../server/scripts/provision.js'

const databaseUrl = process.env.TEST_DATABASE_URL

if (!databaseUrl) {
  throw new Error('TEST_DATABASE_URL is required for backend integration tests')
}

const testDatabase = new URL(databaseUrl).pathname.slice(1)
if (process.env.ALLOW_DESTRUCTIVE_DB_TESTS !== '1' || !testDatabase.endsWith('_test')) {
  throw new Error(
    'Backend integration tests require ALLOW_DESTRUCTIVE_DB_TESTS=1 and a *_test database',
  )
}

function databaseUrlForRole(source, username, password) {
  const url = new URL(source)
  url.username = username
  url.password = password
  return url.toString()
}

const config = loadServerConfig({
  NODE_ENV: 'test',
  DATABASE_URL: databaseUrlForRole(databaseUrl, 'app_runtime', 'runtime-integration'),
  AUTH_DATABASE_URL: databaseUrlForRole(databaseUrl, 'app_auth_runtime', 'auth-integration'),
  DATABASE_MIGRATION_URL: databaseUrl,
  DATABASE_RUNTIME_ROLE: 'app_runtime',
  BETTER_AUTH_SECRET: 'integration-test-secret-that-is-longer-than-32-characters',
  BETTER_AUTH_URL: 'http://127.0.0.1:4320',
  CLIENT_ORIGIN: 'http://127.0.0.1:4318',
})

let app
let pool
let authPool
let firstCookie
let secondCookie

function cookieHeader(response) {
  const value = response.headers['set-cookie']
  const cookies = Array.isArray(value) ? value : [value]
  return cookies.filter(Boolean).map((cookie) => cookie.split(';', 1)[0]).join('; ')
}

async function signUp(email, name) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-up/email',
    headers: {
      host: '127.0.0.1:4320',
      origin: config.clientOrigin,
      'content-type': 'application/json',
    },
    payload: { email, name, password: 'safe-password-1234' },
  })

  expect(response.statusCode, response.body).toBe(200)
  const cookie = cookieHeader(response)
  expect(cookie).not.toBe('')
  return cookie
}

beforeAll(async () => {
  const adminPool = createDatabasePool(config.migrationDatabaseUrl)
  const existingMigrations = await adminPool.query(
    "select to_regclass('public.app_schema_migrations') as migration_table",
  )
  if (existingMigrations.rows[0].migration_table) {
    throw new Error('Backend integration tests require a fresh *_test database')
  }

  await adminPool.query('create role unsafe_parent_role bypassrls nologin')
  await adminPool.query('create role app_runtime noinherit nologin')
  await adminPool.query('grant unsafe_parent_role to app_runtime')
  await expect(migrateDatabase(config)).rejects.toThrow(/unsafe_role_membership/)
  await adminPool.query('revoke unsafe_parent_role from app_runtime')
  await adminPool.query('drop role app_runtime')
  await adminPool.query('drop role unsafe_parent_role')

  await adminPool.query('create role app_runtime superuser login')
  await expect(migrateDatabase(config)).rejects.toThrow(/unsafe_existing_role: app_runtime/)
  await adminPool.query('drop role app_runtime')
  await adminPool.end()

  await migrateDatabase(config)
  await migrateDatabase(config)
  await provisionDatabaseRoles(config)
  pool = createDatabasePool(config.databaseUrl)
  const authBundle = createAuth(config)
  authPool = authBundle.authPool
  await verifyDatabaseBoundaries({ platformPool: pool, authPool })
  app = await createApp({ config, pool, authPool, auth: authBundle.auth })
}, 60_000)

afterAll(async () => {
  if (app) await app.close()
  if (pool) await pool.end()
  if (authPool) await authPool.end()
})

describe('self-hosted backend integration', () => {
  it('실제 세션으로 workspace와 project를 만들고 사용자별로 격리한다', async () => {
    firstCookie = await signUp('owner-a@test.local', 'Owner A')
    secondCookie = await signUp('owner-b@test.local', 'Owner B')

    const firstBootstrap = await app.inject({
      method: 'POST',
      url: '/api/v1/bootstrap',
      headers: { cookie: firstCookie },
      payload: {
        workspaceName: 'Workspace A',
        projectName: 'Project A',
        projectSlug: 'project-a',
      },
    })
    expect(firstBootstrap.statusCode, firstBootstrap.body).toBe(201)

    const secondBootstrap = await app.inject({
      method: 'POST',
      url: '/api/v1/bootstrap',
      headers: { cookie: secondCookie },
      payload: {
        workspaceName: 'Workspace B',
        projectName: 'Project B',
        projectSlug: 'project-b',
      },
    })
    expect(secondBootstrap.statusCode, secondBootstrap.body).toBe(201)

    const firstProjects = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
      headers: { cookie: firstCookie },
    })
    const secondProjects = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
      headers: { cookie: secondCookie },
    })

    expect(firstProjects.statusCode, firstProjects.body).toBe(200)
    expect(secondProjects.statusCode, secondProjects.body).toBe(200)
    expect(firstProjects.json().projects.map((project) => project.slug)).toEqual(['project-a'])
    expect(secondProjects.json().projects.map((project) => project.slug)).toEqual(['project-b'])
  }, 30_000)

  it('runtime 역할은 RLS를 우회하거나 테이블을 소유하지 않는다', async () => {
    const adminPool = createDatabasePool(config.migrationDatabaseUrl)
    const role = await adminPool.query(`
      select rolsuper, rolbypassrls
        from pg_roles
       where rolname = 'app_runtime'
    `)
    const owners = await adminPool.query(`
      select count(*)::integer as count
        from pg_class
       where relnamespace = 'public'::regnamespace
         and relowner = 'app_runtime'::regrole
    `)

    expect(role.rows[0]).toEqual({ rolsuper: false, rolbypassrls: false })
    expect(owners.rows[0].count).toBe(0)
    expect((await pool.query('select current_user')).rows[0].current_user).toBe('app_runtime')
    expect((await authPool.query('select current_user')).rows[0].current_user).toBe(
      'app_auth_runtime',
    )
    await adminPool.end()
  })

  it('비활성화된 identity는 기존 세션이 있어도 거부한다', async () => {
    const adminPool = createDatabasePool(config.migrationDatabaseUrl)
    const disabled = await adminPool.query(`
      update public.identity_users
         set status = 'disabled'
       where email = 'owner-a@test.local'
       returning id
    `)
    await adminPool.end()

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
      headers: { cookie: firstCookie },
    })

    expect(response.statusCode).toBe(403)

    const visibleMemberships = await withActorTransaction(
      pool,
      { actorId: disabled.rows[0].id, runtimeRole: 'app_runtime' },
      async (client) => {
        const result = await client.query(`
          select
            (select count(*)::integer from public.workspace_members) as workspaces,
            (select count(*)::integer from public.project_members) as projects
        `)
        return result.rows[0]
      },
    )
    expect(visibleMemberships).toEqual({ workspaces: 0, projects: 0 })
  })

  it('삭제된 workspace의 활성 사용자도 하위 project를 볼 수 없다', async () => {
    const adminPool = createDatabasePool(config.migrationDatabaseUrl)
    await adminPool.query(`
      update public.workspaces
         set deleted_at = now()
       where name = 'Workspace B'
    `)
    await adminPool.end()

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
      headers: { cookie: secondCookie },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().projects).toEqual([])
  })
})
