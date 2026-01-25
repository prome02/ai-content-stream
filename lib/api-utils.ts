import { NextResponse } from 'next/server'

/**
 * Validation result interface
 */
interface ValidationResult {
  valid: boolean
  error?: {
    code: string
    message: string
    status: number
  }
}

/**
 * Validate uid format for API requests
 * MVP validation: basic checks only
 */
export function validateUid(uid: string | undefined | null): ValidationResult {
  // Check if uid exists
  if (!uid) {
    return {
      valid: false,
      error: {
        code: 'MISSING_UID',
        message: 'User ID (uid) is required',
        status: 400
      }
    }
  }

  // Check uid type
  if (typeof uid !== 'string') {
    return {
      valid: false,
      error: {
        code: 'INVALID_UID_TYPE',
        message: 'User ID must be a string',
        status: 400
      }
    }
  }

  // Check uid length (reasonable bounds)
  if (uid.length < 3 || uid.length > 128) {
    return {
      valid: false,
      error: {
        code: 'INVALID_UID_LENGTH',
        message: 'User ID must be between 3 and 128 characters',
        status: 400
      }
    }
  }

  // Check for invalid characters (basic sanitization)
  const validUidPattern = /^[a-zA-Z0-9_\-@.]+$/
  if (!validUidPattern.test(uid)) {
    return {
      valid: false,
      error: {
        code: 'INVALID_UID_FORMAT',
        message: 'User ID contains invalid characters',
        status: 400
      }
    }
  }

  return { valid: true }
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number = 400
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: code,
      message
    },
    { status }
  )
}

/**
 * Validate request and return error response if invalid
 * Returns null if validation passes
 */
export function validateRequest(body: { uid?: string }): NextResponse | null {
  const validation = validateUid(body?.uid)

  if (!validation.valid && validation.error) {
    return createErrorResponse(
      validation.error.code,
      validation.error.message,
      validation.error.status
    )
  }

  return null
}
