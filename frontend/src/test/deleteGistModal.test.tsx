/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TestWrapper } from './testUtils';
import { DeleteGistModal } from '@/components/gists/DeleteGistModal';
import * as gistService from '@/services/gists';
import type { Gist } from '@/types/gist';

describe('DeleteGistModal Component', () => {
  const mockGist: Gist = {
    id: 12,
    title: 'obsolete.js',
    content: 'console.log("old")',
    owner_id: 1,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders confirmation dialog with gist title, ID, and permanent warning', () => {
    render(
      <TestWrapper>
        <DeleteGistModal
          gist={mockGist}
          isOpen={true}
          onClose={vi.fn()}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Delete Gist')).toBeInTheDocument();
    expect(screen.getByText(/"obsolete.js"/i)).toBeInTheDocument();
    expect(screen.getByText(/ID: #12/i)).toBeInTheDocument();
    expect(screen.getByText(/will be permanently removed/i)).toBeInTheDocument();
  });

  it('closes modal on cancel click', () => {
    const handleClose = vi.fn();

    render(
      <TestWrapper>
        <DeleteGistModal
          gist={mockGist}
          isOpen={true}
          onClose={handleClose}
        />
      </TestWrapper>
    );

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('executes deletion and triggers onDeleted callback on success', async () => {
    const handleClose = vi.fn();
    const handleDeleted = vi.fn();
    const deleteSpy = vi.spyOn(gistService, 'deleteGist').mockResolvedValueOnce(undefined);

    render(
      <TestWrapper>
        <DeleteGistModal
          gist={mockGist}
          isOpen={true}
          onClose={handleClose}
          onDeleted={handleDeleted}
        />
      </TestWrapper>
    );

    const deleteBtn = screen.getByRole('button', { name: /delete permanently/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith(12);
      expect(handleClose).toHaveBeenCalled();
      expect(handleDeleted).toHaveBeenCalled();
    });
  });

  it('displays error message on deletion failure', async () => {
    const error403 = {
      isAxiosError: true,
      response: { status: 403, data: { detail: 'Not authorized to delete this gist' } },
    };
    vi.spyOn(gistService, 'deleteGist').mockRejectedValueOnce(error403);

    render(
      <TestWrapper>
        <DeleteGistModal
          gist={mockGist}
          isOpen={true}
          onClose={vi.fn()}
        />
      </TestWrapper>
    );

    fireEvent.click(screen.getByRole('button', { name: /delete permanently/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Not authorized to delete this gist').length).toBeGreaterThanOrEqual(1);
    });
  });
});
