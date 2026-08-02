import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../../server/app.js'

const apps = []
const config = {
  nodeEnv: 'test',
  clientOrigin: 'http://127.0.0.1:4318',
  authBaseUrl: 'http://127.0.0.1:4320',
  authTrustedProxies: [],
}

function createAuth(session = null, sessionHeaders = new Headers()) {
  return {
    handler: vi.fn(async () => new Response('{}', { status: 200 })),
    api: {
      getSession: vi.fn(async () => ({ headers: sessionHeaders, response: session })),
    },
  }
}

function createAuthPool() {
  return { query: vi.fn(async () => ({ rows: [] })) }
}

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()))
})

describe('custom backend HTTP boundary', () => {
  it('live와 ready 상태를 구분한다', async () => {
    const pool = { query: vi.fn(async () => ({ rows: [{ value: 1 }] })) }
    const app = await createApp({ config, pool, authPool: createAuthPool(), auth: createAuth() })
    apps.push(app)

    expect((await app.inject('/api/health/live')).json()).toEqual({ status: 'ok' })
    expect((await app.inject('/api/health/ready')).json()).toEqual({ status: 'ready' })
  }, 15_000)

  it('DB가 준비되지 않으면 readiness만 503으로 응답한다', async () => {
    const pool = { query: vi.fn(async () => Promise.reject(new Error('offline'))) }
    const app = await createApp({ config, pool, authPool: createAuthPool(), auth: createAuth() })
    apps.push(app)

    expect((await app.inject('/api/health/live')).statusCode).toBe(200)
    expect((await app.inject('/api/health/ready')).statusCode).toBe(503)
  })

  it('세션 없는 프로젝트 요청은 DB에 닿기 전에 거부한다', async () => {
    const pool = { query: vi.fn(), connect: vi.fn() }
    const app = await createApp({ config, pool, authPool: createAuthPool(), auth: createAuth() })
    apps.push(app)

    const response = await app.inject('/api/v1/projects')

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({ error: 'authentication_required' })
    expect(pool.query).not.toHaveBeenCalled()
    expect(pool.connect).not.toHaveBeenCalled()
  })

  it('세션 갱신 Set-Cookie를 API 응답으로 전달한다', async () => {
    const headers = new Headers()
    headers.append('set-cookie', 'site.session=refreshed; Path=/; HttpOnly')
    const auth = createAuth({ user: { id: 'user-a' } }, headers)
    const pool = { query: vi.fn() }
    const app = await createApp({ config, pool, authPool: createAuthPool(), auth })
    apps.push(app)

    const response = await app.inject('/api/me')

    expect(response.statusCode).toBe(200)
    expect([response.headers['set-cookie']].flat().join(';')).toContain(
      'site.session=refreshed',
    )
    expect(response.headers['cache-control']).toBe('private, no-store')
    expect(response.headers.pragma).toBe('no-cache')
    expect(auth.api.getSession).toHaveBeenCalledWith(
      expect.objectContaining({ returnHeaders: true }),
    )
  })

  it('클라이언트가 보낸 IP 헤더를 신뢰하지 않고 Fastify 계산값으로 덮어쓴다', async () => {
    let forwardedRequest
    const auth = createAuth()
    auth.handler.mockImplementation(async (request) => {
      forwardedRequest = request
      return new Response('{}', { status: 200 })
    })
    const app = await createApp({
      config,
      pool: { query: vi.fn() },
      authPool: createAuthPool(),
      auth,
    })
    apps.push(app)

    await app.inject({
      method: 'POST',
      url: '/api/auth/test',
      headers: { 'x-app-client-ip': '203.0.113.50' },
      payload: {},
    })

    expect(forwardedRequest.headers.get('x-app-client-ip')).toBe('127.0.0.1')
  })

  it('클라이언트 Host와 forwarded 헤더 대신 설정된 Auth URL을 사용한다', async () => {
    let forwardedRequest
    const auth = createAuth()
    auth.handler.mockImplementation(async (request) => {
      forwardedRequest = request
      return new Response('{}', { status: 200 })
    })
    const app = await createApp({
      config,
      pool: { query: vi.fn() },
      authPool: createAuthPool(),
      auth,
    })
    apps.push(app)

    await app.inject({
      method: 'POST',
      url: '/api/auth/test?next=projects',
      headers: {
        host: 'attacker.example',
        'x-forwarded-host': 'attacker.example',
        'x-forwarded-proto': 'https',
      },
      payload: {},
    })

    expect(forwardedRequest.url).toBe('http://127.0.0.1:4320/api/auth/test?next=projects')
    expect(forwardedRequest.headers.get('host')).toBe('127.0.0.1:4320')
    expect(forwardedRequest.headers.has('x-forwarded-host')).toBe(false)
    expect(forwardedRequest.headers.has('x-forwarded-proto')).toBe(false)
  })

  it('예상 가능한 DB 충돌을 안정된 API 오류 코드로 변환한다', async () => {
    const databaseError = Object.assign(new Error('duplicate'), { code: '23505' })
    const pool = { query: vi.fn(async () => Promise.reject(databaseError)) }
    const auth = createAuth({ user: { id: 'user-a', email: 'a@example.com', name: 'A' } })
    const app = await createApp({ config, pool, authPool: createAuthPool(), auth })
    apps.push(app)

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/bootstrap',
      payload: {
        workspaceName: 'Workspace',
        projectName: 'Project',
        projectSlug: 'project',
      },
    })

    expect(response.statusCode).toBe(409)
    expect(response.json()).toEqual({ error: 'project_slug_conflict' })
  })
})
