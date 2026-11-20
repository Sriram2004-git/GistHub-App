/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TestWrapper } from './testUtils';
import { SharedGistsPage } from '@/pages/SharedGistsPage';
import * as gistService from '@/services/gists';
import * as authContext from '@/contexts/AuthContext';
import type { Gist } from '@/types/gist';

describe('SharedGistsPage Component', () => {
  const mockUser = { id: 10, username: 'testuser' };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      user: mockUser,
      token: 'jwt',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
  });

  it('renders shared gists with read-only badges', async () => {
    const mockSharedGists: Gist[] = [
      { id: 9, title: 'shared_query.sql', content: 'SELECT * FROM metrics;', owner_id: 20 },
      { id: 11, title: 'shared_infra.tf', content: 'provider "aws" {}', owner_id: 30 },
    ];
    vi.spyOn(gistService, 'getSharedGists').mockResolvedValueOnce(mockSharedGists);

    render(
      <TestWrapper>
        <SharedGistsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('shared_query.sql')).toBeInTheDocument();
      expect(screen.getByText('shared_infra.tf')).toBeInTheDocument();
    });

    // Verify Read-Only behavior
    const sharedBadges = screen.getAllByText('Shared');
    expect(sharedBadges.length).toBe(2);
    // Should provide View action
    const viewButtons = screen.getAllByRole('button', { name: /view/i });
    expect(viewButtons.length).toBe(2);
    // Should NOT have edit or delete actions
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('renders empty state when no gists are shared', async () => {
    vi.spyOn(gistService, 'getSharedGists').mockResolvedValueOnce([]);

    render(
      <TestWrapper>
        <SharedGistsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('No shared gists yet')).toBeInTheDocument();
    });
  });

  it('filters shared gists by search query', async () => {
    const mockSharedGists: Gist[] = [
      { id: 1, title: 'alpha.py', content: 'x = 1', owner_id: 20 },
      { id: 2, title: 'beta.py', content: 'y = 2', owner_id: 30 },
    ];
    vi.spyOn(gistService, 'getSharedGists').mockResolvedValueOnce(mockSharedGists);

    render(
      <TestWrapper>
        <SharedGistsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('alpha.py')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search shared gists/i);
    fireEvent.change(searchInput, { target: { value: 'alpha' } });

    expect(screen.getByText('alpha.py')).toBeInTheDocument();
    expect(screen.queryByText('beta.py')).not.toBeInTheDocument();
  });
});
