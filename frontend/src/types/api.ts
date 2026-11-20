/**
 * Standard FastAPI Validation and Error Types
 */

export interface FastAPIValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
}

export interface HTTPValidationError {
  detail: FastAPIValidationError[];
}

export interface GenericApiErrorDetail {
  detail: string;
}

export type ApiErrorResponse = HTTPValidationError | GenericApiErrorDetail | string;
