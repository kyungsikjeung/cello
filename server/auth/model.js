export const authDatabaseModel = {
  emailAndPassword: { enabled: true },
  user: {
    modelName: 'users',
    deleteUser: { enabled: false },
  },
  session: {
    modelName: 'sessions',
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  account: { modelName: 'accounts' },
  verification: { modelName: 'verifications' },
  rateLimit: {
    enabled: true,
    storage: 'database',
    modelName: 'rate_limits',
  },
  advanced: {
    database: { generateId: 'uuid' },
  },
}
