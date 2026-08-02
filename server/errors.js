export class AppError extends Error {
  constructor(code, statusCode, options = {}) {
    super(code, { cause: options.cause })
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
  }
}

export function mapDatabaseError(error, { uniqueCode = 'conflict', fallbackCode }) {
  if (error instanceof AppError) return error
  if (error?.code === '23505') return new AppError(uniqueCode, 409, { cause: error })
  if (error?.code === '40001') return new AppError('concurrent_update', 409, { cause: error })
  if (error?.code === '42501') return new AppError('permission_denied', 403, { cause: error })
  if (error?.code === '22023' || error?.code === '23514') {
    return new AppError('invalid_state', 422, { cause: error })
  }
  return new AppError(fallbackCode, 500, { cause: error })
}

export function registerErrorHandler(app) {
  app.setErrorHandler((error, request, reply) => {
    const appError =
      error instanceof AppError
        ? error
        : new AppError('internal_error', 500, { cause: error })

    if (appError.statusCode >= 500) {
      request.log.error({ err: appError.cause ?? appError }, 'request failed')
    }

    const payload = { error: appError.code }
    if (appError.statusCode >= 500) payload.requestId = request.id
    return reply.status(appError.statusCode).send(payload)
  })
}
