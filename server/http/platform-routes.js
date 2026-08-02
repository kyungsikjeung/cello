import { z } from 'zod'
import { resolveIdentity } from '../db/identity.js'
import { withActorTransaction } from '../db/with-actor.js'
import { requireSession } from './auth-handler.js'

const bootstrapSchema = z.object({
  workspaceName: z.string().trim().min(1).max(100),
  projectName: z.string().trim().min(1).max(100),
  projectSlug: z
    .string()
    .trim()
    .min(1)
    .max(63)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
})

function databaseErrorStatus(error) {
  if (error?.code === '23505') return 409
  if (error?.code === '40001') return 409
  if (error?.code === '42501') return 403
  if (error?.code === '22023' || error?.code === '23514') return 422
  return 500
}

export function registerPlatformRoutes(app, { auth, pool, runtimeRole }) {
  app.get('/api/me', async (request, reply) => {
    const session = await requireSession(auth, request, reply)
    if (!session) return
    return { user: session.user }
  })

  app.post('/api/v1/bootstrap', async (request, reply) => {
    const session = await requireSession(auth, request, reply)
    if (!session) return

    const input = bootstrapSchema.safeParse(request.body)
    if (!input.success) {
      return reply.status(422).send({
        error: 'invalid_request',
        fields: input.error.issues.map((issue) => issue.path.join('.')),
      })
    }

    try {
      const actorId = await resolveIdentity(pool, session.user)
      const created = await withActorTransaction(
        pool,
        { actorId, runtimeRole },
        async (client) => {
          const result = await client.query(
            'select * from public.bootstrap_workspace($1, $2, $3)',
            [input.data.workspaceName, input.data.projectSlug, input.data.projectName],
          )
          return result.rows[0]
        },
      )

      return reply.status(201).send({
        workspaceId: created.workspace_id,
        projectId: created.project_id,
      })
    } catch (error) {
      request.log.error({ err: error }, 'workspace bootstrap failed')
      return reply.status(databaseErrorStatus(error)).send({ error: 'bootstrap_failed' })
    }
  })

  app.get('/api/v1/projects', async (request, reply) => {
    const session = await requireSession(auth, request, reply)
    if (!session) return

    try {
      const actorId = await resolveIdentity(pool, session.user)
      const projects = await withActorTransaction(
        pool,
        { actorId, runtimeRole },
        async (client) => {
          const result = await client.query(`
            select id, workspace_id, slug, name, current_release_id, created_at, updated_at
              from public.projects
             order by created_at asc
          `)
          return result.rows
        },
      )

      return { projects }
    } catch (error) {
      request.log.error({ err: error }, 'project list failed')
      return reply.status(databaseErrorStatus(error)).send({ error: 'project_list_failed' })
    }
  })
}
