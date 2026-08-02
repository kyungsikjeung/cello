import { z } from 'zod'
import { requireSession } from '../auth/routes.js'
import { mapDatabaseError } from '../errors.js'
import { bootstrapWorkspaceProject, listVisibleProjects } from '../services/platform.js'

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

export function registerPlatformRoutes(app, { auth, pool }) {
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
      const created = await bootstrapWorkspaceProject(pool, session.user, input.data)

      return reply.status(201).send({
        workspaceId: created.workspace_id,
        projectId: created.project_id,
      })
    } catch (error) {
      throw mapDatabaseError(error, {
        uniqueCode: 'project_slug_conflict',
        fallbackCode: 'bootstrap_failed',
      })
    }
  })

  app.get('/api/v1/projects', async (request, reply) => {
    const session = await requireSession(auth, request, reply)
    if (!session) return

    try {
      const projects = await listVisibleProjects(pool, session.user)
      return { projects }
    } catch (error) {
      throw mapDatabaseError(error, { fallbackCode: 'project_list_failed' })
    }
  })
}
