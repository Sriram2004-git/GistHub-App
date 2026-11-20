import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { updateGist } from '@/services/gists';
import type { Gist, GistUpdatePayload } from '@/types/gist';
import { gistKeys } from '@/hooks/queries/gistKeys';

export interface UpdateGistVariables {
  id: number;
  payload: GistUpdatePayload;
}

export function useUpdateGistMutation(
  options?: UseMutationOptions<Gist, Error, UpdateGistVariables>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: ({ id, payload }: UpdateGistVariables) => updateGist(id, payload),
    onSuccess: (data, variables, ...rest) => {
      queryClient.setQueryData(gistKeys.detail(variables.id), data);
      queryClient.invalidateQueries({ queryKey: gistKeys.detail(variables.id) });
      // Invalidate all 'mine' queries regardless of userId using prefix matching.
      queryClient.invalidateQueries({ queryKey: ['gists', 'mine'] });
      options?.onSuccess?.(data, variables, ...rest);
    },
  });
}

export default useUpdateGistMutation;
