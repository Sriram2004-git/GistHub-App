import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { deleteGist } from '@/services/gists';
import { gistKeys } from '@/hooks/queries/gistKeys';

export function useDeleteGistMutation(
  options?: UseMutationOptions<void, Error, number>
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: (id: number) => deleteGist(id),
    onSuccess: (data, id, ...rest) => {
      queryClient.removeQueries({ queryKey: gistKeys.detail(id) });
      // Invalidate all 'mine' queries regardless of userId using prefix matching.
      queryClient.invalidateQueries({ queryKey: ['gists', 'mine'] });
      options?.onSuccess?.(data, id, ...rest);
    },
  });
}

export default useDeleteGistMutation;
