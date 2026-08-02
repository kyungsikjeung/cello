export async function insertWorkspaceProject(client, input) {
  const result = await client.query(
    'select * from public.bootstrap_workspace($1, $2, $3)',
    [input.workspaceName, input.projectSlug, input.projectName],
  )
  return result.rows[0]
}

export async function selectVisibleProjects(client) {
  const result = await client.query(`
    select id, workspace_id, slug, name, current_release_id, created_at, updated_at
      from public.projects
     order by created_at asc
  `)
  return result.rows
}
