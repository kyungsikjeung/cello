import { resolveIdentity } from '../db/identity.js'
import { insertWorkspaceProject, selectVisibleProjects } from '../db/platform-repository.js'
import { withActorTransaction } from '../db/with-actor.js'

async function runAsUser(pool, user, operation) {
  const actorId = await resolveIdentity(pool, user)
  return withActorTransaction(pool, { actorId }, operation)
}

export async function bootstrapWorkspaceProject(pool, user, input) {
  return runAsUser(pool, user, (client) => insertWorkspaceProject(client, input))
}

export async function listVisibleProjects(pool, user) {
  return runAsUser(pool, user, selectVisibleProjects)
}
