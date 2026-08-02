import { describe, expect, it } from 'vitest'
import { migrationChecksum } from '../../server/scripts/migrate.js'

describe('migrationChecksum', () => {
  it('Windows와 Linux 줄바꿈을 같은 migration으로 취급한다', () => {
    expect(migrationChecksum('select 1;\r\nselect 2;\r\n')).toBe(
      migrationChecksum('select 1;\nselect 2;\n'),
    )
  })
})
