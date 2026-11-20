import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import * as authContextModule from '@/contexts/AuthContext';
import {
  gistKeys,
  useMyGistsQuery,
  useSharedGistsQuery,
  useGistDetailQuery,
  useCreateGistMutation,
  useUpdateGistMutation,
  useDeleteGistMutation,
  useShareGistMutation,
} from '@/hooks';
import * as gistServiceModule from '@/services/gists';
import type { Gist, GistShareRead } from '@/types/gist';

const TEST_USER = { id: 42, username: 'testuser' };

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });

const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <NotificationProvider>
          <MemoryRouter>{children}</MemoryRouter>
        </NotificationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('TanStack Query - Gist Keys and Hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.restoreAllMocks();
    // Provide an authenticated user for all hooks that call useAuth().
    vi.spyOn(authContextModule, 'useAuth').mockReturnValue({
      user: TEST_USER,
      token: 'jwt',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
  });

  describe('gistKeys Factory', () => {
    it('produces stable query keys', () => {
      expect(gistKeys.all).toEqual(['gists']);
      // mine() and shared() now require a userId for cache isolation.
      expect(gistKeys.mine(1)).toEqual(['gists', 'mine', 1]);
      expect(gistKeys.mine(99)).toEqual(['gists', 'mine', 99]);
      expect(gistKeys.shared(1)).toEqual(['gists', 'shared', 1]);
      expect(gistKeys.shared(99)).toEqual(['gists', 'shared', 99]);
      expect(gistKeys.details()).toEqual(['gists', 'detail']);
      expect(gistKeys.detail(42)).toEqual(['gists', 'detail', 42]);
      expect(gistKeys.detail(99)).toEqual(['gists', 'detail', 99]);
    });

    it('mine() keys differ across users so caches do not collide', () => {
      expect(gistKeys.mine(1)).not.toEqual(gistKeys.mine(2));
      expect(gistKeys.shared(1)).not.toEqual(gistKeys.shared(2));
    });
  });

  describe('Query Hooks', () => {
    it('useMyGistsQuery fetches owned gists', async () => {
      const mockGists: Gist[] = [
        { id: 1, title: 'one.py', content: 'x = 1', owner_id: TEST_USER.id },
      ];
      vi.spyOn(gistServiceModule, 'getMyGists').mockResolvedValueOnce(mockGists);

      const { result } = renderHook(() => useMyGistsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockGists);
    });

    it('useMyGistsQuery is disabled while auth is loading', () => {
      vi.spyOn(authContextModule, 'useAuth').mockReturnValue({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: true,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
      });
      const fetchSpy = vi.spyOn(gistServiceModule, 'getMyGists');

      const { result } = renderHook(() => useMyGistsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('useMyGistsQuery is disabled when no user is authenticated', () => {
      vi.spyOn(authContextModule, 'useAuth').mockReturnValue({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
      });
      const fetchSpy = vi.spyOn(gistServiceModule, 'getMyGists');

      const { result } = renderHook(() => useMyGistsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('useSharedGistsQuery fetches shared gists', async () => {
      const mockSharedGists: Gist[] = [
        { id: 2, title: 'shared.py', content: 'y = 2', owner_id: 20 },
      ];
      vi.spyOn(gistServiceModule, 'getSharedGists').mockResolvedValueOnce(mockSharedGists);

      const { result } = renderHook(() => useSharedGistsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockSharedGists);
    });

    it('useSharedGistsQuery is disabled while auth is loading', () => {
      vi.spyOn(authContextModule, 'useAuth').mockReturnValue({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: true,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
      });
      const fetchSpy = vi.spyOn(gistServiceModule, 'getSharedGists');

      const { result } = renderHook(() => useSharedGistsQuery(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('useGistDetailQuery fetches gist when ID is valid', async () => {
      const mockGist: Gist = { id: 7, title: 'test.py', content: 'z = 3', owner_id: TEST_USER.id };
      vi.spyOn(gistServiceModule, 'getGistById').mockResolvedValueOnce(mockGist);

      const { result } = renderHook(() => useGistDetailQuery(7), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockGist);
    });

    it('useGistDetailQuery is disabled when ID is invalid or null/undefined', () => {
      const fetchSpy = vi.spyOn(gistServiceModule, 'getGistById');

      // Test with null
      const { result: nullResult } = renderHook(() => useGistDetailQuery(null), {
        wrapper: createWrapper(queryClient),
      });
      expect(nullResult.current.fetchStatus).toBe('idle');
      expect(fetchSpy).not.toHaveBeenCalled();

      // Test with 0 or negative
      const { result: zeroResult } = renderHook(() => useGistDetailQuery(0), {
        wrapper: createWrapper(queryClient),
      });
      expect(zeroResult.current.fetchStatus).toBe('idle');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('useGistDetailQuery is disabled while auth is loading', () => {
      vi.spyOn(authContextModule, 'useAuth').mockReturnValue({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: true,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
      });
      const fetchSpy = vi.spyOn(gistServiceModule, 'getGistById');

      const { result } = renderHook(() => useGistDetailQuery(7), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('Mutation Hooks and Invalidation Logic', () => {
    it('useCreateGistMutation creates gist and invalidates mine query', async () => {
      const newGist: Gist = { id: 10, title: 'new.py', content: 'content', owner_id: TEST_USER.id };
      vi.spyOn(gistServiceModule, 'createGist').mockResolvedValueOnce(newGist);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreateGistMutation(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({ title: 'new.py', content: 'content' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      // Uses prefix ['gists', 'mine'] to match any user-scoped mine key.
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['gists', 'mine'] });
    });

    it('useUpdateGistMutation updates gist and invalidates detail & mine queries', async () => {
      const updatedGist: Gist = { id: 10, title: 'updated.py', content: 'updated', owner_id: TEST_USER.id };
      vi.spyOn(gistServiceModule, 'updateGist').mockResolvedValueOnce(updatedGist);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
      const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

      const { result } = renderHook(() => useUpdateGistMutation(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({ id: 10, payload: { title: 'updated.py' } });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(setQueryDataSpy).toHaveBeenCalledWith(gistKeys.detail(10), updatedGist);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: gistKeys.detail(10) });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['gists', 'mine'] });
    });

    it('useDeleteGistMutation deletes gist and removes from cache', async () => {
      vi.spyOn(gistServiceModule, 'deleteGist').mockResolvedValueOnce(undefined);
      const removeQueriesSpy = vi.spyOn(queryClient, 'removeQueries');
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useDeleteGistMutation(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate(10);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(removeQueriesSpy).toHaveBeenCalledWith({ queryKey: gistKeys.detail(10) });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['gists', 'mine'] });
    });

    it('useShareGistMutation shares gist and invalidates detail query', async () => {
      const shareResult: GistShareRead = { id: 1, gist_id: 10, recipient_id: 99 };
      vi.spyOn(gistServiceModule, 'shareGist').mockResolvedValueOnce(shareResult);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useShareGistMutation(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({ id: 10, payload: { recipient_id: 99 } });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: gistKeys.detail(10) });
    });
  });
});
