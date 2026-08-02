import { z } from 'zod'

const serverConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().min(1).default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4320),
  CLIENT_ORIGIN: z.string().url().default('http://127.0.0.1:4318'),
  DATABASE_URL: z.string().min(1),
  AUTH_DATABASE_URL: z.string().min(1),
  DATABASE_MIGRATION_URL: z.string().min(1).optional(),
  DATABASE_RUNTIME_ROLE: z
    .string()
    .regex(/^[a-z_][a-z0-9_]*$/i)
    .default('app_runtime'),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url().default('http://127.0.0.1:4320'),
  AUTH_TRUSTED_PROXIES: z.string().optional(),
})

export function loadServerConfig(env = process.env) {
  const parsed = serverConfigSchema.safeParse(env)

  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.') || 'environment')
    throw new Error(`Invalid server configuration: ${[...new Set(fields)].join(', ')}`)
  }

  return {
    nodeEnv: parsed.data.NODE_ENV,
    host: parsed.data.API_HOST,
    port: parsed.data.API_PORT,
    clientOrigin: parsed.data.CLIENT_ORIGIN,
    databaseUrl: parsed.data.DATABASE_URL,
    authDatabaseUrl: parsed.data.AUTH_DATABASE_URL,
    migrationDatabaseUrl: parsed.data.DATABASE_MIGRATION_URL,
    runtimeRole: parsed.data.DATABASE_RUNTIME_ROLE,
    authSecret: parsed.data.BETTER_AUTH_SECRET,
    authBaseUrl: parsed.data.BETTER_AUTH_URL,
    authTrustedProxies: (parsed.data.AUTH_TRUSTED_PROXIES ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  }
}
