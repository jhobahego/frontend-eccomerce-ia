import type { ApiError } from './types'

/**
 * Client error vocabulary. Codes are UI-facing buckets, not HTTP statuses —
 * the typed client (T003) unwraps transport wrappers down to the parsed body
 * before calling `normalizeError`, so classification here is message-based.
 * Status-aware classification belongs to T003's client seam, not here.
 *
 * | Code         | Meaning                                              |
 * | ------------ | ---------------------------------------------------- |
 * | UNAUTHORIZED | auth/session failures (bad credentials, expired, inactive) |
 * | FORBIDDEN    | privilege or ownership denials                       |
 * | NOT_FOUND    | missing entity                                       |
 * | CONFLICT     | duplicate / already-exists                           |
 * | VALIDATION   | request shape rejected (first error kept; multi-error aggregation is T009's forms job) |
 * | NETWORK      | transport failure (never a technical string to the UI) |
 * | REQUEST      | any other request failure                            |
 * | UNKNOWN      | non-request failure (programming error, unexpected input) |
 */
export class ApiHttpError extends Error {
  code: string
  field?: string

  constructor(code: string, message: string, field?: string) {
    super(message)
    this.name = 'ApiHttpError'
    this.code = code
    if (field !== undefined) {
      this.field = field
    }
  }
}

interface FastAPIValidationItem {
  loc?: Array<string | number>
  msg?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNetworkFailure(input: unknown): boolean {
  return (
    input instanceof TypeError ||
    (isRecord(input) &&
      typeof input['message'] === 'string' &&
      /failed to fetch|networkerror|network error|load failed/i.test(input['message']))
  )
}

export function codeFor(message: string): string {
  if (
    /not authenticated|unauthorized|incorrect email or password|invalid credentials/i.test(message)
  ) {
    return 'UNAUTHORIZED'
  }
  if (/could not validate credentials|invalid refresh token|inactive user|session/i.test(message)) {
    return 'UNAUTHORIZED'
  }
  if (/forbidden|permission|privileges|not authorized/i.test(message)) {
    return 'FORBIDDEN'
  }
  if (/not found/i.test(message)) {
    return 'NOT_FOUND'
  }
  if (/conflict|already exists|already registered|duplicate/i.test(message)) {
    return 'CONFLICT'
  }
  return 'REQUEST'
}

export function isApiError(value: unknown): value is ApiError {
  return (
    isRecord(value) && typeof value['code'] === 'string' && typeof value['message'] === 'string'
  )
}

function lastNamedSegment(segments: Array<string | number>): string | undefined {
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index]
    if (typeof segment === 'string') {
      return segment
    }
  }
  return undefined
}

export function normalizeError(input: unknown): ApiError {
  if (isApiError(input)) {
    return input
  }
  if (isNetworkFailure(input)) {
    return { code: 'NETWORK', message: 'Sin conexión. Comprueba tu red y reintenta.' }
  }
  if (typeof input === 'string') {
    return { code: codeFor(input), message: input }
  }
  if (input instanceof Error) {
    // Never leak raw technical messages (principle 8): unexpected failures
    // get a generic Spanish message; codes stay machine-readable.
    return { code: 'UNKNOWN', message: 'Ha ocurrido un error inesperado.' }
  }
  if (isRecord(input) && 'detail' in input) {
    const detail = input['detail']
    if (typeof detail === 'string') {
      return { code: codeFor(detail), message: detail }
    }
    if (Array.isArray(detail)) {
      const first = detail[0] as FastAPIValidationItem | undefined
      const message = typeof first?.msg === 'string' ? first.msg : 'Invalid request'
      const segments = Array.isArray(first?.loc) ? first.loc : []
      const field = lastNamedSegment(segments)
      return field === undefined
        ? { code: 'VALIDATION', message }
        : { code: 'VALIDATION', message, field }
    }
  }
  return { code: 'UNKNOWN', message: 'Ha ocurrido un error inesperado.' }
}
