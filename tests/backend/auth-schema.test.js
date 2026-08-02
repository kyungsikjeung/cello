import { readFile } from 'node:fs/promises'
import { getSchema } from 'better-auth/db'
import { describe, expect, it } from 'vitest'
import { authDatabaseModel } from '../../server/auth/model.js'

describe('Better Auth SQL contract', () => {
  it('현재 Better Auth 모델의 모든 테이블과 필드를 migration에 포함한다', async () => {
    const schema = getSchema(authDatabaseModel)
    const migration = await readFile(
      new URL('../../db/migrations/0001_better_auth.sql', import.meta.url),
      'utf8',
    )

    for (const [table, definition] of Object.entries(schema)) {
      expect(migration).toContain(`create table app_auth.${table}`)
      expect(migration).toContain('id uuid primary key')

      for (const field of Object.keys(definition.fields)) {
        const sqlName = /[A-Z]/.test(field) ? `"${field}"` : field
        expect(migration).toContain(sqlName)
      }
    }
  })
})
