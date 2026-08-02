import { describe, expect, it, vi } from 'vitest'
import { createServerRuntime, createShutdown, startServer } from '../../server/runtime.js'

const config = {
  databaseUrl: 'postgresql://app_runtime:test@127.0.0.1:5432/site_builder',
  authDatabaseUrl: 'postgresql://app_auth_runtime:test@127.0.0.1:5432/site_builder',
  host: '127.0.0.1',
  port: 4320,
}

function createPool() {
  return { end: vi.fn(async () => undefined) }
}

function createFakeApp({ listenError } = {}) {
  let onClose
  let closed = false

  return {
    addHook: vi.fn((name, handler) => {
      if (name === 'onClose') onClose = handler
    }),
    listen: vi.fn(async () => {
      if (listenError) throw listenError
    }),
    close: vi.fn(async () => {
      if (closed) return
      closed = true
      await onClose?.()
    }),
  }
}

function dependencies(options = {}) {
  const platformPool = createPool()
  const authPool = createPool()
  const app = createFakeApp(options)

  return {
    platformPool,
    authPool,
    app,
    values: {
      createDatabasePool: vi.fn(() => platformPool),
      createAuth: vi.fn(() => ({ auth: {}, authPool })),
      verifyDatabaseBoundaries: options.verifyDatabaseBoundaries ?? vi.fn(async () => undefined),
      createApp: vi.fn(async () => app),
    },
  }
}

describe('server runtime lifecycle', () => {
  it('시작 경계 검증이 실패하면 생성된 DB pool을 모두 닫는다', async () => {
    const fixture = dependencies({
      verifyDatabaseBoundaries: vi.fn(async () => {
        throw new Error('unsafe database role')
      }),
    })

    await expect(createServerRuntime(config, fixture.values)).rejects.toThrow(
      'unsafe database role',
    )
    expect(fixture.platformPool.end).toHaveBeenCalledOnce()
    expect(fixture.authPool.end).toHaveBeenCalledOnce()
    expect(fixture.values.createApp).not.toHaveBeenCalled()
  })

  it('listen 실패 시 앱과 두 DB pool을 정리한다', async () => {
    const fixture = dependencies({ listenError: new Error('port already in use') })

    await expect(
      startServer({ config, dependencies: fixture.values }),
    ).rejects.toThrow('port already in use')

    expect(fixture.app.close).toHaveBeenCalledOnce()
    expect(fixture.platformPool.end).toHaveBeenCalledOnce()
    expect(fixture.authPool.end).toHaveBeenCalledOnce()
  })

  it('종료 요청이 중복되어도 app.close는 한 번만 실행한다', async () => {
    const app = { close: vi.fn(async () => undefined) }
    const shutdown = createShutdown(app)

    await Promise.all([shutdown(), shutdown(), shutdown()])

    expect(app.close).toHaveBeenCalledOnce()
  })
})
