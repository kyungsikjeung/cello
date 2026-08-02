import { z } from 'zod'

const runtimeConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().min(1).default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4320),
  CLIENT_ORIGIN: z.string().url().default('http://127.0.0.1:4318'),
  DATABASE_URL: z.string().min(1),
  AUTH_DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url().default('http://127.0.0.1:4320'),
  AUTH_TRUSTED_PROXIES: z.string().optional(),
})

const migrationConfigSchema = z.object({
  DATABASE_MIGRATION_URL: z.string().min(1),
})

const provisionConfigSchema = migrationConfigSchema.extend({
  DATABASE_URL: z.string().min(1),
  AUTH_DATABASE_URL: z.string().min(1),
})

function parseEnvironment(schema, env, scope) {
  const parsed = schema.safeParse(env)

  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.') || 'environment')
    throw new Error(`Invalid ${scope} configuration: ${[...new Set(fields)].join(', ')}`)
  }

  return parsed.data
}

export function loadRuntimeConfig(env = process.env) {
  const data = parseEnvironment(runtimeConfigSchema, env, 'runtime')

  return {
    nodeEnv: data.NODE_ENV,
    host: data.API_HOST,
    port: data.API_PORT,
    clientOrigin: data.CLIENT_ORIGIN,
    databaseUrl: data.DATABASE_URL,
    authDatabaseUrl: data.AUTH_DATABASE_URL,
    authSecret: data.BETTER_AUTH_SECRET,
    authBaseUrl: data.BETTER_AUTH_URL,
    authTrustedProxies: (data.AUTH_TRUSTED_PROXIES ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  }
}

export function loadMigrationConfig(env = process.env) {
  const data = parseEnvironment(migrationConfigSchema, env, 'migration')
  return { migrationDatabaseUrl: data.DATABASE_MIGRATION_URL }
}

export function loadProvisionConfig(env = process.env) {
  const data = parseEnvironment(provisionConfigSchema, env, 'provisioning')
  return {
    migrationDatabaseUrl: data.DATABASE_MIGRATION_URL,
    databaseUrl: data.DATABASE_URL,
    authDatabaseUrl: data.AUTH_DATABASE_URL,
  }
}
