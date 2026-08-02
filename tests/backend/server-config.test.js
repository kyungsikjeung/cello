import { describe, expect, it } from 'vitest'
import {
  loadMigrationConfig,
  loadProvisionConfig,
  loadRuntimeConfig,
} from '../../server/config.js'

const runtimeEnvironment = {
  DATABASE_URL: 'postgresql://app_runtime:runtime@127.0.0.1:5432/site_builder',
  AUTH_DATABASE_URL: 'postgresql://app_auth_runtime:auth@127.0.0.1:5432/site_builder',
  BETTER_AUTH_SECRET: 'a-secure-test-secret-that-is-longer-than-32-characters',
}

describe('backend configuration boundaries', () => {
  it('runtime에는 API·Auth 설정만 로드하고 관리자 URL은 노출하지 않는다', () => {
    const config = loadRuntimeConfig({
      ...runtimeEnvironment,
      DATABASE_MIGRATION_URL: 'postgresql://postgres:admin@127.0.0.1:5432/site_builder',
    })

    expect(config.host).toBe('127.0.0.1')
    expect(config.port).toBe(4320)
    expect(config.authTrustedProxies).toEqual([])
    expect(config).not.toHaveProperty('migrationDatabaseUrl')
    expect(config).not.toHaveProperty('runtimeRole')
  })

  it.each([
    ['BETTER_AUTH_SECRET', { ...runtimeEnvironment, BETTER_AUTH_SECRET: 'short' }],
    ['DATABASE_URL', { ...runtimeEnvironment, DATABASE_URL: '' }],
    ['AUTH_DATABASE_URL', { ...runtimeEnvironment, AUTH_DATABASE_URL: '' }],
  ])('잘못된 runtime 설정 %s을 거부한다', (field, environment) => {
    expect(() => loadRuntimeConfig(environment)).toThrow(field)
  })

  it('migration은 관리자 DB URL 외의 설정을 요구하지 않는다', () => {
    expect(
      loadMigrationConfig({
        DATABASE_MIGRATION_URL: 'postgresql://postgres:admin@127.0.0.1:5432/site_builder',
      }),
    ).toEqual({
      migrationDatabaseUrl: 'postgresql://postgres:admin@127.0.0.1:5432/site_builder',
    })
  })

  it('role provisioning은 관리자·업무·Auth DB URL만 요구한다', () => {
    const config = loadProvisionConfig({
      DATABASE_MIGRATION_URL: 'postgresql://postgres:admin@127.0.0.1:5432/site_builder',
      DATABASE_URL: runtimeEnvironment.DATABASE_URL,
      AUTH_DATABASE_URL: runtimeEnvironment.AUTH_DATABASE_URL,
    })

    expect(config.databaseUrl).toBe(runtimeEnvironment.DATABASE_URL)
    expect(config.authDatabaseUrl).toBe(runtimeEnvironment.AUTH_DATABASE_URL)
    expect(config).not.toHaveProperty('authSecret')
  })
})
