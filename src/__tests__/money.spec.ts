import { describe, it, expect } from 'vitest'

import { formatAmount } from '../api/money'

describe('money display-only (T002 anti-float)', () => {
  it('passes amount strings through untouched for display', () => {
    expect(formatAmount('19.99')).toBe('19.99')
    expect(formatAmount('19.90')).toBe('19.90')
    expect(formatAmount('1200')).toBe('1200')
  })

  it('rejects malformed amounts instead of guessing', () => {
    expect(() => formatAmount('')).toThrow(/Invalid amount/)
    expect(() => formatAmount('twelve')).toThrow(/Invalid amount/)
    expect(() => formatAmount('19.999.99')).toThrow(/Invalid amount/)
  })

  it('throws a real Error carrying a VALIDATION code (review I-7)', () => {
    const caught = ((): unknown => {
      try {
        formatAmount('twelve')
      } catch (error) {
        return error
      }
      return null
    })()
    expect(caught).toBeInstanceOf(Error)
    expect(caught).toMatchObject({ code: 'VALIDATION' })
  })
  it('documents why float math is banned on amounts', () => {
    // 0.1 + 0.2 !== 0.3 in binary floats: authoritative totals always come
    // from the server as strings; the client only displays them.
    expect(0.1 + 0.2 === 0.3).toBe(false)
    expect(formatAmount('0.3')).toBe('0.3')
  })
})
