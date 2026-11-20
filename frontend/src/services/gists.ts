import apiClient from '@/lib/api';
import type {
  Gist,
  GistCreatePayload,
  GistShareCreatePayload,
  GistShareRead,
  GistUpdatePayload,
} from '@/types/gist';

/**
 * Retrieve all Gists owned by the currently authenticated user.
 * GET /gists
 */
export async function getMyGists(): Promise<Gist[]> {
  const response = await apiClient.get<Gist[]>('/gists');
  return response.data;
}

/**
 * Alias for getMyGists for backward compatibility.
 */
export const listUserGists = getMyGists;

/**
 * Create a new Gist owned by the authenticated user.
 * POST /gists
 */
export async function createGist(payload: GistCreatePayload): Promise<Gist> {
  const response = await apiClient.post<Gist>('/gists', payload);
  return response.data;
}

/**
 * Retrieve all Gists shared with the currently authenticated user.
 * GET /gists/shared
 */
export async function getSharedGists(): Promise<Gist[]> {
  const response = await apiClient.get<Gist[]>('/gists/shared');
  return response.data;
}

/**
 * Alias for getSharedGists for backward compatibility.
 */
export const listSharedGists = getSharedGists;

/**
 * Retrieve details of a specific Gist by its ID.
 * Allowed for the owner or authorized share recipients.
 * GET /gists/{gist_id}
 */
export async function getGistById(gistId: number): Promise<Gist> {
  const response = await apiClient.get<Gist>(`/gists/${gistId}`);
  return response.data;
}

/**
 * Update the title or content of an owned Gist.
 * Only the owner can update.
 * PUT /gists/{gist_id}
 */
export async function updateGist(gistId: number, payload: GistUpdatePayload): Promise<Gist> {
  const response = await apiClient.put<Gist>(`/gists/${gistId}`, payload);
  return response.data;
}

/**
 * Permanently delete a Gist.
 * Only the owner can delete.
 * DELETE /gists/{gist_id}
 */
export async function deleteGist(gistId: number): Promise<void> {
  await apiClient.delete(`/gists/${gistId}`);
}

/**
 * Share a Gist with another user by recipient user ID.
 * Only the owner can share.
 * POST /gists/{gist_id}/share
 */
export async function shareGist(
  gistId: number,
  payload: GistShareCreatePayload
): Promise<GistShareRead> {
  const response = await apiClient.post<GistShareRead>(`/gists/${gistId}/share`, payload);
  return response.data;
}

/**
 * Centralized gistService namespace.
 */
export const gistService = {
  getMyGists,
  listUserGists,
  createGist,
  getSharedGists,
  listSharedGists,
  getGistById,
  updateGist,
  deleteGist,
  shareGist,
};

export default gistService;
