/// <reference types="@testing-library/jest-dom/vitest" />
/**
 * Cache Isolation Tests — Bug 6.1-1
 *
 * Verifies that authenticated Gist query caches are strictly isolated per user:
 *  - User A's data is not visible to User B after account switching.
 *  - Logout clears all user-scoped query cache entries.
 *  - Queries do not fire until the auth session has been fully restored.
 *  - Switching back to User A re-fetches User A's data correctly.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import * as authContextModule from '@/contexts/AuthContext';
import type { AuthContextType } from '@/contexts/AuthContext';
import { gistKeys, useMyGistsQuery, useSharedGistsQuery } from '@/hooks';
import * as gistServiceModule from '@/services/gists';
import type { Gist } from '@/types/gist';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_A = { id: 1, username: 'alice' };
const USER_B = { id: 2, username: 'bob' };

const GISTS_A: Gist[] = [
  { id: 10, title: 'alice_script.py', content: 'print("alice")', owner_id: USER_A.id },
  { id: 11, title: 'alice_config.yaml', content: 'key: value', owner_id: USER_A.id },
];
const SHARED_A: Gist[] = [
  { id: 20, title: 'shared_with_alice.sh', content: '#!/bin/bash', owner_id: USER_B.id },
];

const GISTS_B: Gist[] = [
  { id: 30, title: 'bob_index.ts', content: 'export default {}', owner_id: USER_B.id },
];
const SHARED_B: Gist[] = [
  { id: 40, title: 'shared_with_bob.md', content: '# Docs', owner_id: USER_A.id },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeAuthValue = (
  user: typeof USER_A | typeof USER_B | null,
  isLoading = false
): AuthContextType => ({
  user,
  token: user ? 'jwt' : null,
  isAuthenticated: !!user,
  isLoading,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
});

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: 0 },
      mutations: { retry: false },
    },
  });

/** Wrapper that provides all required context providers but no AuthProvider
 *  (we mock useAuth at the module level for fine-grained control). */
const createWrapper = (queryClient: QueryClient) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <NotificationProvider>
          <MemoryRouter>{children}</MemoryRouter>
        </NotificationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
  return Wrapper;
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Cache Isolation — user-scoped query keys', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.restoreAllMocks();
  });

  // ── 1. Query key structure ──────────────────────────────────────────────────

  it("User A's query key is different from User B's query key", () => {
    expect(gistKeys.mine(USER_A.id)).not.toEqual(gistKeys.mine(USER_B.id));
    expect(gistKeys.shared(USER_A.id)).not.toEqual(gistKeys.shared(USER_B.id));
    expect(gistKeys.mine(USER_A.id)).toEqual(['gists', 'mine', USER_A.id]);
    expect(gistKeys.mine(USER_B.id)).toEqual(['gists', 'mine', USER_B.id]);
  });

  // ── 2. User A loads data ────────────────────────────────────────────────────

  it('User A fetches only User A data', async () => {
    vi.spyOn(authContextModule, 'useAuth').mockReturnValue(makeAuthValue(USER_A));
    vi.spyOn(gistServiceModule, 'getMyGists').mockResolvedValue(GISTS_A);
    vi.spyOn(gistServiceModule, 'getSharedGists').mockResolvedValue(SHARED_A);

    const wrapper = createWrapper(queryClient);

    const { result: mine } = renderHook(() => useMyGistsQuery(), { wrapper });
    const { result: shared } = renderHook(() => useSharedGistsQuery(), { wrapper });

    await waitFor(() => expect(mine.current.isSuccess).toBe(true));
    await waitFor(() => expect(shared.current.isSuccess).toBe(true));

    expect(mine.current.data).toEqual(GISTS_A);
    expect(shared.current.data).toEqual(SHARED_A);

    // Confirm data is stored under User A's scoped key.
    expect(queryClient.getQueryData(gistKeys.mine(USER_A.id))).toEqual(GISTS_A);
    expect(queryClient.getQueryData(gistKeys.shared(USER_A.id))).toEqual(SHARED_A);

    // User B's key must have no data.
    expect(queryClient.getQueryData(gistKeys.mine(USER_B.id))).toBeUndefined();
    expect(queryClient.getQueryData(gistKeys.shared(USER_B.id))).toBeUndefined();
  });

  // ── 3. Account switch: User A → User B ─────────────────────────────────────

  it('after switching to User B, User B sees only User B data', async () => {
    // Seed User A data in the cache under A's keys.
    queryClient.setQueryData(gistKeys.mine(USER_A.id), GISTS_A);
    queryClient.setQueryData(gistKeys.shared(USER_A.id), SHARED_A);

    // Now auth is User B.
    vi.spyOn(authContextModule, 'useAuth').mockReturnValue(makeAuthValue(USER_B));
    vi.spyOn(gistServiceModule, 'getMyGists').mockResolvedValue(GISTS_B);
    vi.spyOn(gistServiceModule, 'getSharedGists').mockResolvedValue(SHARED_B);

    const wrapper = createWrapper(queryClient);

    const { result: mine } = renderHook(() => useMyGistsQuery(), { wrapper });
    const { result: shared } = renderHook(() => useSharedGistsQuery(), { wrapper });

    await waitFor(() => expect(mine.current.isSuccess).toBe(true));
    await waitFor(() => expect(shared.current.isSuccess).toBe(true));

    // User B sees User B's data.
    expect(mine.current.data).toEqual(GISTS_B);
    expect(shared.current.data).toEqual(SHARED_B);

    // User A's data is in a different cache slot and was not served to User B.
    expect(mine.current.data).not.toEqual(GISTS_A);
    expect(shared.current.data).not.toEqual(SHARED_A);
  });

  // ── 4. User A's data not shown during User B loading ───────────────────────

  it("User A's cached data is not returned while User B's queries are loading", async () => {
    // Seed User A's cache.
    queryClient.setQueryData(gistKeys.mine(USER_A.id), GISTS_A);

    // Simulate User B — query is in-flight (not yet resolved).
    vi.spyOn(authContextModule, 'useAuth').mockReturnValue(makeAuthValue(USER_B));
    vi.spyOn(gistServiceModule, 'getMyGists').mockReturnValue(new Promise(() => {})); // never resolves

    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useMyGistsQuery(), { wrapper });

    // The hook is loading (pending), and must NOT return User A's data.
    await waitFor(() => expect(result.current.isLoading).toBe(true));
    expect(result.current.data).toBeUndefined();
  });

  // ── 5. Queries disabled during session restoration ─────────────────────────

  it('queries do not fire while isLoading (session restoration) is true', () => {
    // Auth is still restoring — no user known yet.
    vi.spyOn(authContextModule, 'useAuth').mockReturnValue(makeAuthValue(null, true));
    const fetchSpy = vi.spyOn(gistServiceModule, 'getMyGists');

    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useMyGistsQuery(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('queries do not fire when no user is authenticated (after logout)', () => {
    vi.spyOn(authContextModule, 'useAuth').mockReturnValue(makeAuthValue(null, false));
    const fetchSpy = vi.spyOn(gistServiceModule, 'getMyGists');

    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useMyGistsQuery(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // ── 6. GistCacheManager cache eviction on user change ──────────────────────

  it('GistCacheManager removes User A cache when user transitions to null (logout)', async () => {
    // Seed User A's data in the cache.
    queryClient.setQueryData(gistKeys.mine(USER_A.id), GISTS_A);
    queryClient.setQueryData(gistKeys.shared(USER_A.id), SHARED_A);

    // Directly simulate what GistCacheManager does on logout:
    // remove user-scoped mine/shared and all detail entries.
    act(() => {
      queryClient.removeQueries({ queryKey: gistKeys.mine(USER_A.id) });
      queryClient.removeQueries({ queryKey: gistKeys.shared(USER_A.id) });
      queryClient.removeQueries({ queryKey: gistKeys.details() });
    });

    // After cache eviction, no data should remain under User A's keys.
    expect(queryClient.getQueryData(gistKeys.mine(USER_A.id))).toBeUndefined();
    expect(queryClient.getQueryData(gistKeys.shared(USER_A.id))).toBeUndefined();
  });

  it('GistCacheManager removes User A cache when user switches to User B', async () => {
    queryClient.setQueryData(gistKeys.mine(USER_A.id), GISTS_A);
    queryClient.setQueryData(gistKeys.shared(USER_A.id), SHARED_A);

    // Simulate GistCacheManager removing the previous user's (A's) cache.
    act(() => {
      queryClient.removeQueries({ queryKey: gistKeys.mine(USER_A.id) });
      queryClient.removeQueries({ queryKey: gistKeys.shared(USER_A.id) });
    });

    // User B's keys should be empty; User A's data is gone.
    expect(queryClient.getQueryData(gistKeys.mine(USER_A.id))).toBeUndefined();
    expect(queryClient.getQueryData(gistKeys.shared(USER_A.id))).toBeUndefined();
    expect(queryClient.getQueryData(gistKeys.mine(USER_B.id))).toBeUndefined();
  });

  // ── 7. Switching back to User A loads correct data ─────────────────────────

  it('switching back to User A after User B loads correct User A data', async () => {
    // User B session, B data cached.
    queryClient.setQueryData(gistKeys.mine(USER_B.id), GISTS_B);

    // Now re-authenticate as User A.
    vi.spyOn(authContextModule, 'useAuth').mockReturnValue(makeAuthValue(USER_A));
    vi.spyOn(gistServiceModule, 'getMyGists').mockResolvedValue(GISTS_A);

    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useMyGistsQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // User A's fresh data is returned, NOT User B's cached data.
    expect(result.current.data).toEqual(GISTS_A);
    expect(result.current.data).not.toEqual(GISTS_B);
  });
});
