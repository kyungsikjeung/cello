import { fromNodeHeaders } from 'better-auth/node'

function forwardSetCookies(headers, reply) {
  const cookies = headers?.getSetCookie?.() ?? []
  if (cookies.length) reply.header('set-cookie', cookies)
}

export function registerAuthRoutes(app, auth) {
  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    async handler(request, reply) {
      const origin = `${request.protocol}://${request.headers.host}`
      const url = new URL(request.url, origin)
      const headers = fromNodeHeaders(request.headers)
      headers.set('x-app-client-ip', request.ip)
      const webRequest = new Request(url, {
        method: request.method,
        headers,
        ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }),
      })
      const response = await auth.handler(webRequest)

      reply.status(response.status)
      const setCookies = response.headers.getSetCookie?.() ?? []
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() !== 'set-cookie') reply.header(key, value)
      })
      if (setCookies.length) reply.header('set-cookie', setCookies)

      const body = response.body ? await response.text() : null
      return reply.send(body)
    },
  })
}

export async function requireSession(auth, request, reply) {
  const headers = fromNodeHeaders(request.headers)
  headers.set('x-app-client-ip', request.ip)
  const result = await auth.api.getSession({
    headers,
    returnHeaders: true,
  })
  const session = result?.response ?? null
  forwardSetCookies(result?.headers, reply)
  reply.header('cache-control', 'private, no-store')
  reply.header('pragma', 'no-cache')

  if (!session) {
    reply.status(401).send({ error: 'authentication_required' })
    return null
  }

  return session
}
