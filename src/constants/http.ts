// constants/http.ts
// HTTP 状态码常量映射

export const HttpStatus = {
  // 2xx Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // 3xx Redirection
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,

  // 4xx Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // 5xx Server Errors
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const

// 状态码到 i18n key 的映射
export const HttpStatusKey = {
  [HttpStatus.BAD_REQUEST]: 'http.error.badRequest',
  [HttpStatus.UNAUTHORIZED]: 'http.error.unauthorized',
  [HttpStatus.FORBIDDEN]: 'http.error.forbidden',
  [HttpStatus.NOT_FOUND]: 'http.error.notFound',
  [HttpStatus.METHOD_NOT_ALLOWED]: 'http.error.methodNotAllowed',
  [HttpStatus.CONFLICT]: 'http.error.conflict',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'http.error.unprocessableEntity',
  [HttpStatus.TOO_MANY_REQUESTS]: 'http.error.tooManyRequests',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'http.error.internalServerError',
  [HttpStatus.BAD_GATEWAY]: 'http.error.badGateway',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'http.error.serviceUnavailable',
  [HttpStatus.GATEWAY_TIMEOUT]: 'http.error.gatewayTimeout',
} as const

export type HttpStatusCode = typeof HttpStatus[keyof typeof HttpStatus]
export type HttpStatusI18nKey = typeof HttpStatusKey[keyof typeof HttpStatusKey]

// 获取状态码对应的 i18n key
export function getStatusI18nKey(status: number): HttpStatusI18nKey | undefined {
  return HttpStatusKey[status as keyof typeof HttpStatusKey]
}
