import { ApiHttpError } from './errors'

const AMOUNT_PATTERN = /^-?\d+(\.\d+)?$/

/**
 * Display-only passthrough for server-issued decimal strings.
 * Never an operand: any arithmetic on amounts is a defect (0.1 + 0.2 !== 0.3).
 * Throws a real `Error` (with `code: VALIDATION`) so boundaries and
 * `instanceof` checks keep working.
 */
export function formatAmount(value: string): string {
  if (!AMOUNT_PATTERN.test(value)) {
    throw new ApiHttpError('VALIDATION', `Invalid amount: ${value}`)
  }
  return value
}
