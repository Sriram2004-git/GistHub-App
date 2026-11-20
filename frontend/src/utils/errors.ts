import axios, { AxiosError } from 'axios';
import type { FastAPIValidationError, HTTPValidationError } from '@/types/api';

/**
 * Checks whether an error is an Axios error.
 */
export function isApiError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error);
}

/**
 * Extracts HTTP status code from an error if available.
 */
export function getApiStatusCode(error: unknown): number | null {
  if (isApiError(error) && error.response) {
    return error.response.status;
  }
  return null;
}

/**
 * Formats a FastAPI validation error location into a readable field name.
 * e.g., ["body", "title"] -> "title", ["body", "user", "username"] -> "user.username"
 */
function formatFieldLocation(loc: (string | number)[]): string {
  // Strip common root elements like 'body', 'query', 'path'
  const filtered = loc.filter((part) => part !== 'body' && part !== 'query' && part !== 'path');
  return filtered.length > 0 ? filtered.join('.') : 'field';
}

/**
 * Extracts per-field validation errors from a FastAPI 422 response.
 * Returns an object mapping field names to human-readable error messages.
 */
export function extractValidationErrors(error: unknown): Record<string, string> {
  const result: Record<string, string> = {};

  if (!isApiError(error) || !error.response?.data) {
    return result;
  }

  const data = error.response.data as Partial<HTTPValidationError>;
  if (Array.isArray(data.detail)) {
    for (const item of data.detail as FastAPIValidationError[]) {
      if (item && Array.isArray(item.loc) && item.msg) {
        const field = formatFieldLocation(item.loc);
        if (!result[field]) {
          result[field] = item.msg;
        }
      }
    }
  }

  return result;
}

/**
 * Formats a FastAPI 422 validation error detail into a human-readable string.
 */
function formatValidationErrorMessage(detail: FastAPIValidationError[]): string {
  if (!Array.isArray(detail) || detail.length === 0) {
    return 'Validation failed. Please verify your input.';
  }

  const messages = detail.map((err) => {
    const field = formatFieldLocation(err.loc);
    return `${field}: ${err.msg}`;
  });

  return messages.join(', ');
}

/**
 * Extracts a standardized, user-friendly error message from an API error response.
 * Handles HTTP 400, 401, 403, 404, 422, 500, and network connectivity failures.
 * Never exposes raw backend stack traces or internal implementation details.
 */
export function getApiErrorMessage(error: unknown, fallbackMessage = 'An unexpected error occurred.'): string {
  if (!error) {
    return fallbackMessage;
  }

  // Handle Axios / Network / HTTP Errors
  if (isApiError(error)) {
    // Network errors (no response received or network connection refused)
    if (!error.response || error.code === 'ERR_NETWORK') {
      return 'Unable to connect to the server. Please verify the backend is running and check your connection.';
    }

    const { status, data } = error.response;

    // HTTP 5xx Server Errors: Always mask internal server details and stack traces
    if (status >= 500) {
      return 'An internal server error occurred. Please try again later.';
    }

    // HTTP 422 Unprocessable Entity (FastAPI validation error)
    if (status === 422 && data && typeof data === 'object') {
      const valData = data as Partial<HTTPValidationError>;
      if (Array.isArray(valData.detail)) {
        return formatValidationErrorMessage(valData.detail);
      }
    }

    // Direct detail string from backend (HTTP 400, 401, 403, 404, etc.)
    if (data && typeof data === 'object' && 'detail' in data) {
      const detail = (data as { detail: unknown }).detail;
      if (typeof detail === 'string' && detail.trim().length > 0) {
        return detail;
      }
    }

    // Direct message property
    if (data && typeof data === 'object' && 'message' in data) {
      const message = (data as { message: unknown }).message;
      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }

    // Status-specific fallbacks
    switch (status) {
      case 400:
        return 'Invalid request. Please check your submission.';
      case 401:
        return 'Your session has expired or is invalid. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 422:
        return 'Validation failed. Please verify your input.';
      case 500:
      case 502:
      case 503:
      case 504:
        // Mask raw server details and stack traces
        return 'An internal server error occurred. Please try again later.';
      default:
        return fallbackMessage;
    }
  }

  // Handle standard JavaScript Error
  if (error instanceof Error) {
    return error.message || fallbackMessage;
  }

  // Handle string error
  if (typeof error === 'string') {
    return error;
  }

  return fallbackMessage;
}
