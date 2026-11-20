import { describe, it, expect } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import {
  getApiErrorMessage,
  extractValidationErrors,
  getApiStatusCode,
  isApiError,
} from '@/utils/errors';
import type { HTTPValidationError } from '@/types/api';

function createMockAxiosError(
  status?: number,
  data?: unknown,
  code?: string
): AxiosError {
  const headers = new AxiosHeaders();
  const config = { headers };

  const error = new AxiosError(
    'Request failed',
    code,
    config,
    {},
    status
      ? {
          status,
          statusText: 'Error',
          data,
          headers: {},
          config,
        }
      : undefined
  );

  return error;
}

describe('Standardized API Error Utility', () => {
  it('identifies Axios errors correctly', () => {
    const axiosError = createMockAxiosError(404, { detail: 'Not Found' });
    const standardError = new Error('Standard Error');

    expect(isApiError(axiosError)).toBe(true);
    expect(isApiError(standardError)).toBe(false);
    expect(isApiError(null)).toBe(false);
  });

  it('extracts HTTP status codes correctly', () => {
    const error404 = createMockAxiosError(404);
    const networkError = createMockAxiosError(undefined, undefined, 'ERR_NETWORK');

    expect(getApiStatusCode(error404)).toBe(404);
    expect(getApiStatusCode(networkError)).toBeNull();
    expect(getApiStatusCode(new Error('Generic'))).toBeNull();
  });

  describe('getApiErrorMessage', () => {
    it('handles network errors when backend is unreachable', () => {
      const networkError = createMockAxiosError(undefined, undefined, 'ERR_NETWORK');
      const message = getApiErrorMessage(networkError);

      expect(message).toContain('Unable to connect to the server');
    });

    it('handles HTTP 400 Bad Request with custom backend detail', () => {
      const error = createMockAxiosError(400, { detail: 'Cannot share gist with yourself' });
      expect(getApiErrorMessage(error)).toBe('Cannot share gist with yourself');
    });

    it('handles HTTP 400 Bad Request with default message when detail is missing', () => {
      const error = createMockAxiosError(400, {});
      expect(getApiErrorMessage(error)).toBe('Invalid request. Please check your submission.');
    });

    it('handles HTTP 401 Unauthorized with custom detail or fallback', () => {
      const errorWithDetail = createMockAxiosError(401, { detail: 'Could not validate credentials' });
      expect(getApiErrorMessage(errorWithDetail)).toBe('Could not validate credentials');

      const errorWithoutDetail = createMockAxiosError(401, {});
      expect(getApiErrorMessage(errorWithoutDetail)).toBe(
        'Your session has expired or is invalid. Please log in again.'
      );
    });

    it('handles HTTP 403 Forbidden with custom detail or fallback', () => {
      const errorWithDetail = createMockAxiosError(403, {
        detail: 'Not authorized to modify this gist',
      });
      expect(getApiErrorMessage(errorWithDetail)).toBe('Not authorized to modify this gist');

      const errorWithoutDetail = createMockAxiosError(403, {});
      expect(getApiErrorMessage(errorWithoutDetail)).toBe(
        'You do not have permission to perform this action.'
      );
    });

    it('handles HTTP 404 Not Found with custom detail or fallback', () => {
      const errorWithDetail = createMockAxiosError(404, { detail: 'Gist not found' });
      expect(getApiErrorMessage(errorWithDetail)).toBe('Gist not found');

      const errorWithoutDetail = createMockAxiosError(404, {});
      expect(getApiErrorMessage(errorWithoutDetail)).toBe('The requested resource was not found.');
    });

    it('handles HTTP 422 FastAPI validation errors and formats field locations', () => {
      const valPayload: HTTPValidationError = {
        detail: [
          {
            loc: ['body', 'title'],
            msg: 'Field required',
            type: 'missing',
          },
          {
            loc: ['body', 'content'],
            msg: 'Field required',
            type: 'missing',
          },
        ],
      };
      const error = createMockAxiosError(422, valPayload);
      const message = getApiErrorMessage(error);

      expect(message).toBe('title: Field required, content: Field required');
    });

    it('handles HTTP 500 Internal Server Error without exposing stack traces', () => {
      const serverTracePayload = {
        detail: 'Traceback (most recent call last):\n  File "/app/main.py", line 42, in crash\nException: DB died',
      };
      // Internal error status 500 should never expose the stack trace
      const error = createMockAxiosError(500, serverTracePayload);
      const message = getApiErrorMessage(error);

      expect(message).toBe('An internal server error occurred. Please try again later.');
      expect(message).not.toContain('Traceback');
      expect(message).not.toContain('crash');
    });

    it('handles plain JavaScript Error and string errors', () => {
      expect(getApiErrorMessage(new Error('Custom error message'))).toBe('Custom error message');
      expect(getApiErrorMessage('Simple string failure')).toBe('Simple string failure');
      expect(getApiErrorMessage(null, 'Fallback default')).toBe('Fallback default');
    });
  });

  describe('extractValidationErrors', () => {
    it('extracts per-field validation messages from FastAPI 422 detail', () => {
      const valPayload: HTTPValidationError = {
        detail: [
          {
            loc: ['body', 'title'],
            msg: 'String should have at least 1 character',
            type: 'string_too_short',
          },
          {
            loc: ['body', 'recipient_id'],
            msg: 'Input should be a valid integer',
            type: 'int_type',
          },
        ],
      };
      const error = createMockAxiosError(422, valPayload);
      const fields = extractValidationErrors(error);

      expect(fields).toEqual({
        title: 'String should have at least 1 character',
        recipient_id: 'Input should be a valid integer',
      });
    });

    it('returns empty object when error is not 422 or has no detail array', () => {
      const error = createMockAxiosError(400, { detail: 'Not validation' });
      expect(extractValidationErrors(error)).toEqual({});
      expect(extractValidationErrors(new Error())).toEqual({});
    });
  });
});
