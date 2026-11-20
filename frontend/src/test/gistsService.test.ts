import { describe, it, expect, beforeEach, vi } from 'vitest';
import apiClient from '@/lib/api';
import {
  getMyGists,
  listUserGists,
  getSharedGists,
  listSharedGists,
  getGistById,
  createGist,
  updateGist,
  deleteGist,
  shareGist,
  gistService,
} from '@/services/gists';
import type { Gist, GistShareRead } from '@/types/gist';

describe('Gists API Service Layer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMyGists (and listUserGists alias)', () => {
    it('sends GET /gists and returns the owned gists list', async () => {
      const mockGists: Gist[] = [
        { id: 1, title: 'demo.py', content: "print('hello')", owner_id: 10 },
        { id: 2, title: 'notes.md', content: '# Meeting Notes', owner_id: 10 },
      ];

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: mockGists });

      const result = await getMyGists();
      expect(getSpy).toHaveBeenCalledWith('/gists');
      expect(result).toEqual(mockGists);

      // Verify alias
      const aliasResult = await listUserGists();
      expect(aliasResult).toEqual(mockGists);
    });
  });

  describe('getSharedGists (and listSharedGists alias)', () => {
    it('sends GET /gists/shared and returns the shared gists list', async () => {
      const mockSharedGists: Gist[] = [
        { id: 5, title: 'shared_utils.py', content: 'def helper(): pass', owner_id: 99 },
      ];

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: mockSharedGists });

      const result = await getSharedGists();
      expect(getSpy).toHaveBeenCalledWith('/gists/shared');
      expect(result).toEqual(mockSharedGists);

      const aliasResult = await listSharedGists();
      expect(aliasResult).toEqual(mockSharedGists);
    });
  });

  describe('getGistById', () => {
    it('sends GET /gists/{id} and returns the gist detail', async () => {
      const mockGist: Gist = {
        id: 42,
        title: 'config.json',
        content: '{"debug": true}',
        owner_id: 10,
      };

      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: mockGist });

      const result = await getGistById(42);
      expect(getSpy).toHaveBeenCalledWith('/gists/42');
      expect(result).toEqual(mockGist);
    });
  });

  describe('createGist', () => {
    it('sends POST /gists with valid payload and returns created Gist', async () => {
      const payload = {
        title: 'main.rs',
        content: 'fn main() { println!("Hello"); }',
      };
      const createdGist: Gist = {
        id: 101,
        title: payload.title,
        content: payload.content,
        owner_id: 10,
      };

      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: createdGist });

      const result = await createGist(payload);
      expect(postSpy).toHaveBeenCalledWith('/gists', payload);
      expect(result).toEqual(createdGist);
    });
  });

  describe('updateGist', () => {
    it('sends PUT /gists/{id} with updated title or content', async () => {
      const payload = {
        title: 'updated_title.rs',
      };
      const updatedGist: Gist = {
        id: 101,
        title: 'updated_title.rs',
        content: 'fn main() { println!("Hello"); }',
        owner_id: 10,
      };

      const putSpy = vi.spyOn(apiClient, 'put').mockResolvedValueOnce({ data: updatedGist });

      const result = await updateGist(101, payload);
      expect(putSpy).toHaveBeenCalledWith('/gists/101', payload);
      expect(result).toEqual(updatedGist);
    });
  });

  describe('deleteGist', () => {
    it('sends DELETE /gists/{id} and returns successfully', async () => {
      const deleteSpy = vi.spyOn(apiClient, 'delete').mockResolvedValueOnce({ data: undefined });

      await deleteGist(101);
      expect(deleteSpy).toHaveBeenCalledWith('/gists/101');
    });
  });

  describe('shareGist', () => {
    it('sends POST /gists/{id}/share with recipient_id payload', async () => {
      const payload = { recipient_id: 25 };
      const shareResult: GistShareRead = {
        id: 1,
        gist_id: 101,
        recipient_id: 25,
      };

      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ data: shareResult });

      const result = await shareGist(101, payload);
      expect(postSpy).toHaveBeenCalledWith('/gists/101/share', payload);
      expect(result).toEqual(shareResult);
    });
  });

  describe('gistService namespace object', () => {
    it('exposes all endpoints via unified service object', () => {
      expect(typeof gistService.getMyGists).toBe('function');
      expect(typeof gistService.listUserGists).toBe('function');
      expect(typeof gistService.createGist).toBe('function');
      expect(typeof gistService.getSharedGists).toBe('function');
      expect(typeof gistService.listSharedGists).toBe('function');
      expect(typeof gistService.getGistById).toBe('function');
      expect(typeof gistService.updateGist).toBe('function');
      expect(typeof gistService.deleteGist).toBe('function');
      expect(typeof gistService.shareGist).toBe('function');
    });
  });
});
