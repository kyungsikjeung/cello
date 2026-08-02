import { describe, expect, it, vi } from 'vitest'
import { withActorTransaction } from '../../server/db/with-actor.js'

const ACTOR_ID = '11111111-1111-4111-8111-111111111111'

function createPool() {
  const queries = []
  const client = {
    query: vi.fn(async (sql, values) => {
      queries.push({ sql, values })
      return { rows: [] }
    }),
    release: vi.fn(),
  }
  return {
    queries,
    client,
    pool: { connect: vi.fn(async () => client) },
  }
}

describe('withActorTransaction', () => {
  it('역할과 사용자 문맥을 트랜잭션 로컬로 주입한다', async () => {
    const fixture = createPool()

    const result = await withActorTransaction(
      fixture.pool,
      { actorId: ACTOR_ID, runtimeRole: 'app_runtime' },
      async (client) => {
        await client.query('select visible_project')
        return 'done'
      },
    )

    expect(result).toBe('done')
    expect(fixture.queries.map(({ sql }) => sql)).toEqual([
      'begin',
      'set local role app_runtime',
      "select set_config('app.user_id', $1, true)",
      'select visible_project',
      'commit',
    ])
    expect(fixture.queries[2].values).toEqual([ACTOR_ID])
    expect(fixture.client.release).toHaveBeenCalledOnce()
  })

  it('업무 쿼리 실패 시 롤백하고 연결을 반환한다', async () => {
    const fixture = createPool()

    await expect(
      withActorTransaction(fixture.pool, { actorId: ACTOR_ID }, async () => {
        throw new Error('query failed')
      }),
    ).rejects.toThrow('query failed')

    expect(fixture.queries.at(-1).sql).toBe('rollback')
    expect(fixture.client.release).toHaveBeenCalledOnce()
  })

  it('SQL 식별자로 사용할 수 없는 역할명을 차단한다', async () => {
    await expect(
      withActorTransaction(
        { connect: vi.fn() },
        { actorId: ACTOR_ID, runtimeRole: 'app_runtime; reset role' },
        vi.fn(),
      ),
    ).rejects.toThrow('runtimeRole is invalid')
  })

  it('롤백도 실패하면 연결을 폐기하도록 오류와 함께 반환한다', async () => {
    const fixture = createPool()
    const rollbackError = new Error('connection lost during rollback')
    fixture.client.query.mockImplementation(async (sql, values) => {
      fixture.queries.push({ sql, values })
      if (sql === 'rollback') throw rollbackError
      return { rows: [] }
    })

    await expect(
      withActorTransaction(fixture.pool, { actorId: ACTOR_ID }, async () => {
        throw new Error('query failed')
      }),
    ).rejects.toThrow(AggregateError)

    expect(fixture.client.release).toHaveBeenCalledWith(rollbackError)
  })
})
