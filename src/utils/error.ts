import { ApiResponse } from '../types';

const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';

export const getErrorMessage = (
  error: unknown,
  fallback: string = DEFAULT_ERROR_MESSAGE
): string => {
  if (typeof error === 'string' && error.trim()) return error;

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }

  return fallback;
};

export const getApiErrorMessage = <T>(
  response: ApiResponse<T>,
  fallback: string = DEFAULT_ERROR_MESSAGE
): string => {
  if (typeof response.error === 'string' && response.error.trim()) {
    return response.error;
  }

  if (typeof response.message === 'string' && response.message.trim()) {
    return response.message;
  }

  return fallback;
};
