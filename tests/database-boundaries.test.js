import { describe, expect, it, vi } from 'vitest'
import { verifyDatabaseBoundaries } from '../server/db/boundaries.js'

function rolePool(roleName, overrides = {}) {
  return {
    query: vi.fn(async (sql) => {
      if (sql.includes('from pg_roles')) {
        return {
          rows: [
            {
              role_name: roleName,
              rolsuper: false,
              rolbypassrls: false,
              has_memberships: false,
              ...overrides,
            },
          ],
        }
      }
      return { rows: [] }
    }),
  }
}

describe('database startup boundaries', () => {
  it('분리된 최소권한 runtime 계정만 허용한다', async () => {
    const platformPool = rolePool('app_runtime')
    const authPool = rolePool('app_auth_runtime')

    await expect(verifyDatabaseBoundaries({ platformPool, authPool })).resolves.toBeUndefined()
    expect(authPool.query).toHaveBeenCalledWith('select 1 from app_auth.users limit 0')
  })

  it('관리자나 BYPASSRLS 연결이면 시작을 중단한다', async () => {
    await expect(
      verifyDatabaseBoundaries({
        platformPool: rolePool('postgres', { rolsuper: true, rolbypassrls: true }),
        authPool: rolePool('app_auth_runtime'),
      }),
    ).rejects.toThrow(/expected app_runtime/)
  })

  it('안전하지 않은 상위 역할 membership도 시작 시 거부한다', async () => {
    await expect(
      verifyDatabaseBoundaries({
        platformPool: rolePool('app_runtime', { has_memberships: true }),
        authPool: rolePool('app_auth_runtime'),
      }),
    ).rejects.toThrow(/expected app_runtime/)
  })
})
