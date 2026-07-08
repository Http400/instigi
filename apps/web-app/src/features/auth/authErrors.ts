import type { ApiError } from '@instigi/types';

const CODE_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  EMAIL_TAKEN: 'An account with this email already exists.',
  VALIDATION_ERROR: 'Please check the details you entered.',
};

const NETWORK_MESSAGE =
  "Can't reach the server. Check your connection and try again.";

const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof (value as { code: unknown }).code === 'string'
  );
}

/**
 * Translate an RTK Query error (or any thrown value) into user-facing copy.
 */
export function authErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status: unknown }).status;
    if (status === 'FETCH_ERROR' || status === 'TIMEOUT_ERROR') {
      return NETWORK_MESSAGE;
    }
    const data = (error as { data?: unknown }).data;
    if (isApiError(data)) {
      return CODE_MESSAGES[data.code] ?? data.message ?? GENERIC_MESSAGE;
    }
  }
  return GENERIC_MESSAGE;
}
