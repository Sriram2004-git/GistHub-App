/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TestWrapper } from './testUtils';
import { HomePage } from '@/pages/HomePage';
import * as gistService from '@/services/gists';
import * as authContext from '@/contexts/AuthContext';
import type { Gist } from '@/types/gist';

describe('HomePage Component with Real Gist Data', () => {
  const mockUser = { id: 10, username: 'charlie' };

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

  it('renders real counts and gists preview lists', async () => {
    const mockOwned: Gist[] = [
      { id: 1, title: 'owned1.py', content: 'print(1)', owner_id: 10 },
      { id: 2, title: 'owned2.py', content: 'print(2)', owner_id: 10 },
    ];
    const mockShared: Gist[] = [
      { id: 99, title: 'shared_external.py', content: 'print(99)', owner_id: 50 },
    ];

    vi.spyOn(gistService, 'getMyGists').mockResolvedValueOnce(mockOwned);
    vi.spyOn(gistService, 'getSharedGists').mockResolvedValueOnce(mockShared);

    render(
      <TestWrapper>
        <HomePage />
      </TestWrapper>
    );

    // Verify metrics numbers
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // Owned Gists count
      expect(screen.getByText('1')).toBeInTheDocument(); // Shared count
    });

    // Verify preview items
    expect(screen.getByText('owned1.py')).toBeInTheDocument();
    expect(screen.getByText('owned2.py')).toBeInTheDocument();
    expect(screen.getByText('shared_external.py')).toBeInTheDocument();
  });

  it('renders empty states when user has 0 owned and 0 shared gists', async () => {
    vi.spyOn(gistService, 'getMyGists').mockResolvedValueOnce([]);
    vi.spyOn(gistService, 'getSharedGists').mockResolvedValueOnce([]);

    render(
      <TestWrapper>
        <HomePage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('No gists created yet')).toBeInTheDocument();
      expect(screen.getByText('No shared gists yet')).toBeInTheDocument();
    });

    expect(screen.getAllByText('0 Total').length).toBe(2);
  });
});
