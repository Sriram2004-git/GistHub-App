import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { getSharedGists } from '@/services/gists';
import type { Gist } from '@/types/gist';
import { useAuth } from '@/contexts/AuthContext';
import { gistKeys } from './gistKeys';

/**
 * Fetches gists shared with the currently authenticated user.
 *
 * The query is automatically disabled while the session is being restored
 * (`isLoading`) or when no user is authenticated, preventing premature
 * fetches and ensuring the correct user's token is used.
 *
 * The query key includes the user ID so User A's shared-gist cache is never
 * served to User B when accounts are switched without a full page refresh.
 */
export function useSharedGistsQuery(options?: Partial<UseQueryOptions<Gist[], Error>>) {
  const { user, isLoading: isAuthLoading } = useAuth();

  return useQuery({
    queryKey: user ? gistKeys.shared(user.id) : [...gistKeys.all, 'shared', 'unauthenticated'],
    queryFn: getSharedGists,
    // Do not fetch until session restoration is complete and a user is known.
    enabled: !isAuthLoading && !!user && (options?.enabled ?? true),
    ...options,
  });
}

export default useSharedGistsQuery;
