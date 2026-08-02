import { describe, expect, it } from 'vitest'
import { loadServerConfig } from '../../server/config.js'

const validEnvironment = {
  DATABASE_URL: 'postgresql://app_runtime:runtime@127.0.0.1:5432/site_builder',
  AUTH_DATABASE_URL: 'postgresql://app_auth_runtime:auth@127.0.0.1:5432/site_builder',
  BETTER_AUTH_SECRET: 'a-secure-test-secret-that-is-longer-than-32-characters',
}

describe('loadServerConfig', () => {
  it('안전한 로컬 기본값을 적용한다', () => {
    const config = loadServerConfig(validEnvironment)

    expect(config.host).toBe('127.0.0.1')
    expect(config.port).toBe(4320)
    expect(config.runtimeRole).toBe('app_runtime')
    expect(config.authTrustedProxies).toEqual([])
  })

  it('짧은 인증 비밀키와 잘못된 DB 역할을 거부한다', () => {
    expect(() =>
      loadServerConfig({
        ...validEnvironment,
        BETTER_AUTH_SECRET: 'short',
        DATABASE_RUNTIME_ROLE: 'app_runtime; reset role',
      }),
    ).toThrow(/BETTER_AUTH_SECRET/)
  })
})
