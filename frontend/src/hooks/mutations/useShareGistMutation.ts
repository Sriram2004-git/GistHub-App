import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { shareGist } from '@/services/gists';
import type { GistShareCreatePayload, GistShareRead } from '@/types/gist';
import { gistKeys } from '@/hooks/queries/gistKeys';

export interface ShareGistVariables {
  id: number;
  payload: GistShareCreatePayload;
}

export function useShareGistMutation(
  options?: UseMutationOptions<GistShareRead, Error, ShareGistVariables>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: ({ id, payload }: ShareGistVariables) => shareGist(id, payload),
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: gistKeys.detail(variables.id) });
      options?.onSuccess?.(data, variables, ...rest);
    },
  });
}

export default useShareGistMutation;
