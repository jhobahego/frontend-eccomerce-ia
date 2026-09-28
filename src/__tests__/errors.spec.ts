import { describe, it, expect } from 'vitest'

import { normalizeError, isApiError } from '../api/errors'

describe('error envelope (T002)', () => {
  it('normalizes FastAPI detail strings', () => {
    expect(normalizeError({ detail: 'Not authenticated' })).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Not authenticated',
    })
  })

  it('normalizes FastAPI validation error lists keeping the first field', () => {
    const result = normalizeError({
      detail: [
        { loc: ['body', 'price'], msg: 'Input should be a valid number', type: 'float_type' },
      ],
    })
    expect(result).toEqual({
      code: 'VALIDATION',
      message: 'Input should be a valid number',
      field: 'price',
    })
    expect(isApiError(result)).toBe(true)
  })

  it('classifies the real backend auth/session strings (review I-2)', () => {
    expect(normalizeError({ detail: 'Could not validate credentials' }).code).toBe('UNAUTHORIZED')
    expect(normalizeError({ detail: 'Invalid refresh token' }).code).toBe('UNAUTHORIZED')
    expect(normalizeError({ detail: 'Inactive user' }).code).toBe('UNAUTHORIZED')
    expect(normalizeError({ detail: "The user doesn't have enough privileges" }).code).toBe(
      'FORBIDDEN',
    )
    expect(normalizeError({ detail: 'Not authorized to cancel this order' }).code).toBe('FORBIDDEN')
  })

  it('maps network failure to a non-technical code (review I-3)', () => {
    const result = normalizeError(new TypeError('Failed to fetch'))
    expect(result.code).toBe('NETWORK')
    expect(result.message).not.toMatch(/fetch/i)
  })

  it('points nested validation locations at the last named field (review I-6)', () => {
    const result = normalizeError({
      detail: [{ loc: ['body', 'items', 0, 'quantity'], msg: 'Too small', type: 'ge' }],
    })
    expect(result).toEqual({ code: 'VALIDATION', message: 'Too small', field: 'quantity' })
  })
  it('passes ApiError values through and falls back for the unknown', () => {
    const apiError = { code: 'NOT_FOUND', message: 'Missing' }
    expect(normalizeError(apiError)).toBe(apiError)
    expect(normalizeError(new Error('boom'))).toEqual({
      code: 'UNKNOWN',
      message: 'Ha ocurrido un error inesperado.',
    })
    expect(normalizeError(null)).toEqual({
      code: 'UNKNOWN',
      message: 'Ha ocurrido un error inesperado.',
    })
    expect(isApiError({ code: 'X' })).toBe(false)
  })

  it('never leaks raw technical messages for unknown failures (branch review)', () => {
    for (const input of [new Error('boom'), new Error(''), null, undefined, 42]) {
      const result = normalizeError(input)
      expect(result.code).toBe('UNKNOWN')
      expect(result.message).toBe('Ha ocurrido un error inesperado.')
    }
  })
})
