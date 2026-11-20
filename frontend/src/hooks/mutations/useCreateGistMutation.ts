import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { createGist } from '@/services/gists';
import type { Gist, GistCreatePayload } from '@/types/gist';

export function useCreateGistMutation(
  options?: UseMutationOptions<Gist, Error, GistCreatePayload>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (payload: GistCreatePayload) => createGist(payload),
    onSuccess: (...args) => {
      // Invalidate all 'mine' queries regardless of userId so the list refreshes
      // for the currently authenticated user. Using the prefix ['gists', 'mine']
      // matches any user-scoped key ['gists', 'mine', <userId>].
      queryClient.invalidateQueries({ queryKey: ['gists', 'mine'] });
      options?.onSuccess?.(...args);
    },
  });
}

export default useCreateGistMutation;
