/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TestWrapper } from './testUtils';
import { GistDetailPage } from '@/pages/GistDetailPage';
import * as gistService from '@/services/gists';
import * as authContext from '@/contexts/AuthContext';
import type { Gist } from '@/types/gist';

let mockParams = { gistId: '42' };
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => vi.fn(),
  };
});

describe('GistDetailPage Component', () => {
  const mockOwnerUser = { id: 10, username: 'alice' };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockParams = { gistId: '42' };
    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      user: mockOwnerUser,
      token: 'jwt',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('handles invalid Gist ID format gracefully', () => {
    mockParams = { gistId: 'abc-invalid' };

    render(
      <TestWrapper>
        <GistDetailPage />
      </TestWrapper>
    );

    expect(screen.getByText('Invalid Gist ID')).toBeInTheDocument();
  });

  it('renders gist details and owner actions for owner', async () => {
    const mockGist: Gist = {
      id: 42,
      title: 'setup.cfg',
      content: '[metadata]\nname = demo',
      owner_id: 10, // matches alice (id: 10)
    };
    vi.spyOn(gistService, 'getGistById').mockResolvedValueOnce(mockGist);

    render(
      <TestWrapper>
        <GistDetailPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('setup.cfg')[0]).toBeInTheDocument();
      expect(screen.getByText(/\[metadata\]/)).toBeInTheDocument();
    });

    expect(screen.getByText('#42')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy content/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.queryByText(/shared with you/i)).not.toBeInTheDocument();
  });

  it('renders read-only badge and hides edit/delete buttons for shared recipient', async () => {
    const mockGist: Gist = {
      id: 42,
      title: 'shared_code.rs',
      content: 'fn add() {}',
      owner_id: 999, // different from alice (id: 10)
    };
    vi.spyOn(gistService, 'getGistById').mockResolvedValueOnce(mockGist);

    render(
      <TestWrapper>
        <GistDetailPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('shared_code.rs')[0]).toBeInTheDocument();
    });

    expect(screen.getByText(/shared with you \(read only\)/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('handles HTTP 403 Forbidden with dedicated access denied screen', async () => {
    const error403 = {
      isAxiosError: true,
      response: { status: 403, data: { detail: 'Not authorized to access this gist' } },
    };
    vi.spyOn(gistService, 'getGistById').mockRejectedValueOnce(error403);

    render(
      <TestWrapper>
        <GistDetailPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });
    expect(screen.getByText(/you do not have permission to view this gist/i)).toBeInTheDocument();
  });

  it('handles HTTP 404 Not Found appropriately', async () => {
    const error404 = {
      isAxiosError: true,
      response: { status: 404, data: { detail: 'Gist not found' } },
    };
    vi.spyOn(gistService, 'getGistById').mockRejectedValueOnce(error404);

    render(
      <TestWrapper>
        <GistDetailPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Gist Not Found')).toBeInTheDocument();
    });
  });

  it('copies content to clipboard on Copy Content button click', async () => {
    const mockGist: Gist = {
      id: 42,
      title: 'copy-test.txt',
      content: 'Clipboard text payload',
      owner_id: 10,
    };
    vi.spyOn(gistService, 'getGistById').mockResolvedValueOnce(mockGist);

    render(
      <TestWrapper>
        <GistDetailPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('copy-test.txt')[0]).toBeInTheDocument();
    });

    const copyBtn = screen.getByRole('button', { name: /copy content/i });
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Clipboard text payload');
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });
});
