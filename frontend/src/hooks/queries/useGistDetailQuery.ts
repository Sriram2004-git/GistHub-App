import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getGistById } from '@/services/gists';
import type { Gist } from '@/types/gist';
import { useAuth } from '@/contexts/AuthContext';
import { gistKeys } from './gistKeys';

/**
 * Fetches a single Gist by its numeric ID.
 *
 * The query is disabled when:
 * - The ID is null, undefined, NaN, or ≤ 0 (invalid).
 * - The auth session is still being restored (`isLoading`).
 * - No authenticated user is present.
 *
 * This prevents requests from firing before the JWT is available and prevents
 * stale cached data from a previous user from being displayed while the new
 * user's session is being established.
 *
 * Gist detail keys do NOT include the user ID because gist IDs are globally
 * unique and backend authorization controls access — there is no risk of
 * cross-user detail cache collision.
 */
export function useGistDetailQuery(
  id: number | null | undefined,
  options?: Partial<UseQueryOptions<Gist, Error>>
) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const isValidId = typeof id === 'number' && !isNaN(id) && id > 0;

  return useQuery({
    queryKey: isValidId ? gistKeys.detail(id) : [...gistKeys.details(), 'invalid'],
    queryFn: () => {
      if (!isValidId) {
        throw new Error('A valid Gist ID is required to fetch gist details');
      }
      return getGistById(id);
    },
    enabled: isValidId && !isAuthLoading && !!user && (options?.enabled ?? true),
    ...options,
  });
}

export default useGistDetailQuery;
