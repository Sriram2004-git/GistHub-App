/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TestWrapper } from './testUtils';
import { MyGistsPage } from '@/pages/MyGistsPage';
import * as gistService from '@/services/gists';
import * as authContext from '@/contexts/AuthContext';
import type { Gist } from '@/types/gist';

describe('MyGistsPage Component', () => {
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

  it('renders loading state initially', () => {
    // Return a never-resolving promise to hold loading state
    vi.spyOn(gistService, 'getMyGists').mockImplementation(() => new Promise(() => {}));

    render(
      <TestWrapper>
        <MyGistsPage />
      </TestWrapper>
    );

    expect(screen.getByText('My Gists')).toBeInTheDocument();
    // Skeleton elements should be rendered
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders list of owned gists successfully', async () => {
    const mockGists: Gist[] = [
      { id: 1, title: 'server.py', content: "print('Starting server')", owner_id: 10 },
      { id: 2, title: 'utils.ts', content: 'export const add = (a, b) => a + b;', owner_id: 10 },
    ];
    vi.spyOn(gistService, 'getMyGists').mockResolvedValueOnce(mockGists);

    render(
      <TestWrapper>
        <MyGistsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('server.py')).toBeInTheDocument();
      expect(screen.getByText('utils.ts')).toBeInTheDocument();
    });

    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText("print('Starting server')")).toBeInTheDocument();
  });

  it('renders empty state when user has no gists', async () => {
    vi.spyOn(gistService, 'getMyGists').mockResolvedValueOnce([]);

    render(
      <TestWrapper>
        <MyGistsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("You haven't created any gists yet")).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /create your first gist/i })).toBeInTheDocument();
  });

  it('renders error state with retry button on fetch failure', async () => {
    vi.spyOn(gistService, 'getMyGists').mockRejectedValueOnce(new Error('Network failure'));

    render(
      <TestWrapper>
        <MyGistsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load gists')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('filters gists by title or content and clears search', async () => {
    const mockGists: Gist[] = [
      { id: 1, title: 'docker-compose.yml', content: 'version: "3.8"', owner_id: 10 },
      { id: 2, title: 'schema.sql', content: 'CREATE TABLE users (id INT);', owner_id: 10 },
      { id: 3, title: 'script.py', content: 'import docker', owner_id: 10 },
    ];
    vi.spyOn(gistService, 'getMyGists').mockResolvedValueOnce(mockGists);

    render(
      <TestWrapper>
        <MyGistsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('docker-compose.yml')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search gists by title or content/i);

    // Filter for "docker" (matches title of #1 and content of #3)
    fireEvent.change(searchInput, { target: { value: 'docker' } });

    expect(screen.getByText('docker-compose.yml')).toBeInTheDocument();
    expect(screen.getByText('script.py')).toBeInTheDocument();
    expect(screen.queryByText('schema.sql')).not.toBeInTheDocument();

    // Filter for non-matching query
    fireEvent.change(searchInput, { target: { value: 'nonexistent-string' } });
    expect(screen.getByText(/no gists matching "nonexistent-string"/i)).toBeInTheDocument();

    // Clear search
    const clearButton = screen.getAllByRole('button', { name: /clear search/i })[0];
    fireEvent.click(clearButton);

    expect(screen.getByText('docker-compose.yml')).toBeInTheDocument();
    expect(screen.getByText('schema.sql')).toBeInTheDocument();
    expect(screen.getByText('script.py')).toBeInTheDocument();
  });

  it('opens delete confirmation modal when delete button is clicked', async () => {
    const mockGists: Gist[] = [
      { id: 10, title: 'target-to-delete.ts', content: 'const a = 1;', owner_id: 10 },
    ];
    vi.spyOn(gistService, 'getMyGists').mockResolvedValueOnce(mockGists);

    render(
      <TestWrapper>
        <MyGistsPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('target-to-delete.ts')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteBtn);

    // Modal should appear
    expect(screen.getByText('Delete Gist')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete this gist\?/i)).toBeInTheDocument();
    expect(screen.getByText(/"target-to-delete.ts"/i)).toBeInTheDocument();
  });
});
