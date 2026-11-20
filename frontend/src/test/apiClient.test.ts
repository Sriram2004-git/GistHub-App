import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  apiClient,
  TOKEN_STORAGE_KEY,
  getStoredToken,
  setStoredToken,
  removeStoredToken,
} from '@/lib/api';

describe('Centralized Axios API Client and Interceptors', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Token Storage Helpers', () => {
    it('manages token storage lifecycle', () => {
      expect(getStoredToken()).toBeNull();

      setStoredToken('test-jwt-token-123');
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('test-jwt-token-123');
      expect(getStoredToken()).toBe('test-jwt-token-123');

      removeStoredToken();
      expect(getStoredToken()).toBeNull();
    });
  });

  describe('Request Interceptor', () => {
    it('attaches Authorization header when token is stored', async () => {
      setStoredToken('mock-jwt-token');

      // Use axios adapter / interceptor check
      const config = { headers: {} as Record<string, string> };
      // Invoke the request interceptor directly from apiClient
      const requestInterceptor = (apiClient.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (conf: typeof config) => typeof config }>;
      }).handlers[0].fulfilled;

      const processedConfig = requestInterceptor(config);
      expect(processedConfig.headers.Authorization).toBe('Bearer mock-jwt-token');
    });

    it('does not attach Authorization header when token is absent', async () => {
      const config = { headers: {} as Record<string, string> };
      const requestInterceptor = (apiClient.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (conf: typeof config) => typeof config }>;
      }).handlers[0].fulfilled;

      const processedConfig = requestInterceptor(config);
      expect(processedConfig.headers.Authorization).toBeUndefined();
    });
  });

  describe('Response Interceptor (401 Handling)', () => {
    it('clears token and dispatches auth:unauthorized event on 401 for normal API routes', async () => {
      setStoredToken('stale-jwt-token');
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      const responseInterceptorError = (apiClient.interceptors.response as unknown as {
        handlers: Array<{ rejected: (error: unknown) => Promise<unknown> }>;
      }).handlers[0].rejected;

      const mockError = {
        config: { url: '/gists' },
        response: { status: 401, data: { detail: 'Token expired' } },
      };

      await expect(responseInterceptorError(mockError)).rejects.toEqual(mockError);

      expect(getStoredToken()).toBeNull();
      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(dispatchSpy.mock.calls[0][0].type).toBe('auth:unauthorized');
    });

    it('does NOT clear token or dispatch auth:unauthorized on 401 during /auth/login attempts', async () => {
      setStoredToken('existing-token');
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      const responseInterceptorError = (apiClient.interceptors.response as unknown as {
        handlers: Array<{ rejected: (error: unknown) => Promise<unknown> }>;
      }).handlers[0].rejected;

      const loginError = {
        config: { url: '/auth/login' },
        response: { status: 401, data: { detail: 'Incorrect username or password' } },
      };

      await expect(responseInterceptorError(loginError)).rejects.toEqual(loginError);

      // Token should NOT be removed and event should NOT be fired for login rejections
      expect(getStoredToken()).toBe('existing-token');
      expect(dispatchSpy).not.toHaveBeenCalled();
    });
  });

  describe('Axios Client Defaults', () => {
    it('configures default timeout and json headers', () => {
      expect(apiClient.defaults.timeout).toBe(10000);
      expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
      expect(apiClient.defaults.headers['Accept']).toBe('application/json');
    });
  });
});
