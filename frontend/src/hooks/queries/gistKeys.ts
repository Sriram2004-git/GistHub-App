/**
 * Centralized TanStack Query Keys for GistHub Gist queries and cache management.
 *
 * User-scoped keys (mine, shared) include the authenticated user's ID so that
 * data belonging to User A can never be reused for User B within the same
 * in-memory QueryClient session.
 *
 * Gist detail keys remain user-agnostic: each gist ID is globally unique and
 * the backend enforces ownership / share access, so no cross-user collision can
 * occur in the detail cache.
 */
export const gistKeys = {
  all: ['gists'] as const,
  mine: (userId: number) => [...gistKeys.all, 'mine', userId] as const,
  shared: (userId: number) => [...gistKeys.all, 'shared', userId] as const,
  details: () => [...gistKeys.all, 'detail'] as const,
  detail: (id: number) => [...gistKeys.details(), id] as const,
};
