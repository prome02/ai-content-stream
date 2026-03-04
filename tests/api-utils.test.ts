// tests/api-utils.test.ts

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body: object, init?: { status?: number }) => ({
      _body: body,
      status: init?.status ?? 200,
    })),
  },
}))

import { validateUid, validateRequest, createErrorResponse } from '@/lib/api-utils'

// ---------------------------------------------------------------------------
// validateUid
// ---------------------------------------------------------------------------
describe('validateUid', () => {
  test('valid uid returns valid: true', () => {
    expect(validateUid('user_abc123')).toEqual({ valid: true })
  })

  test('null returns MISSING_UID error', () => {
    const result = validateUid(null)
    expect(result.valid).toBe(false)
    expect(result.error?.code).toBe('MISSING_UID')
    expect(result.error?.status).toBe(400)
  })

  test('undefined returns MISSING_UID error', () => {
    const result = validateUid(undefined)
    expect(result.valid).toBe(false)
    expect(result.error?.code).toBe('MISSING_UID')
  })

  test('empty string returns MISSING_UID error', () => {
    const result = validateUid('')
    expect(result.valid).toBe(false)
    expect(result.error?.code).toBe('MISSING_UID')
  })

  test('uid shorter than 3 chars returns INVALID_UID_LENGTH', () => {
    expect(validateUid('ab').error?.code).toBe('INVALID_UID_LENGTH')
    expect(validateUid('a').error?.code).toBe('INVALID_UID_LENGTH')
  })

  test('uid of exactly 3 chars is valid', () => {
    expect(validateUid('abc').valid).toBe(true)
  })

  test('uid longer than 128 chars returns INVALID_UID_LENGTH', () => {
    const longUid = 'a'.repeat(129)
    expect(validateUid(longUid).error?.code).toBe('INVALID_UID_LENGTH')
  })

  test('uid of exactly 128 chars is valid', () => {
    const uid = 'a'.repeat(128)
    expect(validateUid(uid).valid).toBe(true)
  })

  test('uid with invalid characters returns INVALID_UID_FORMAT', () => {
    expect(validateUid('user name').error?.code).toBe('INVALID_UID_FORMAT')
    expect(validateUid('user!abc').error?.code).toBe('INVALID_UID_FORMAT')
    expect(validateUid('user#tag').error?.code).toBe('INVALID_UID_FORMAT')
  })

  test('uid with allowed special characters is valid', () => {
    expect(validateUid('user_name').valid).toBe(true)
    expect(validateUid('user-name').valid).toBe(true)
    expect(validateUid('user@email.com').valid).toBe(true)
    expect(validateUid('user.name').valid).toBe(true)
  })

  test('uid with mixed alphanumeric is valid', () => {
    expect(validateUid('abc123XYZ').valid).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// createErrorResponse
// ---------------------------------------------------------------------------
describe('createErrorResponse', () => {
  test('returns response with given code and message', () => {
    const res = createErrorResponse('SOME_ERROR', 'Something went wrong') as any
    expect(res._body.success).toBe(false)
    expect(res._body.error).toBe('SOME_ERROR')
    expect(res._body.message).toBe('Something went wrong')
  })

  test('defaults to status 400', () => {
    const res = createErrorResponse('ERR', 'msg') as any
    expect(res.status).toBe(400)
  })

  test('respects custom status code', () => {
    const res = createErrorResponse('NOT_FOUND', 'Not found', 404) as any
    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// validateRequest
// ---------------------------------------------------------------------------
describe('validateRequest', () => {
  test('returns null for valid uid (validation passes)', () => {
    expect(validateRequest({ uid: 'valid_user123' })).toBeNull()
  })

  test('returns error response when uid is missing', () => {
    const result = validateRequest({}) as any
    expect(result).not.toBeNull()
    expect(result._body.success).toBe(false)
  })

  test('returns error response when uid is too short', () => {
    const result = validateRequest({ uid: 'ab' }) as any
    expect(result).not.toBeNull()
    expect(result._body.error).toBe('INVALID_UID_LENGTH')
  })

  test('returns error response for uid with invalid characters', () => {
    const result = validateRequest({ uid: 'bad uid!' }) as any
    expect(result).not.toBeNull()
    expect(result._body.error).toBe('INVALID_UID_FORMAT')
  })
})
