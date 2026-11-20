/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import * as authContext from '@/contexts/AuthContext';
import { EditGistPage } from '@/pages/EditGistPage';
import { GistDetailPage } from '@/pages/GistDetailPage';
import * as gistService from '@/services/gists';
import type { Gist } from '@/types/gist';

describe('Edit Navigation and Browser Back History Workflows', () => {
  const mockUser = { id: 10, username: 'charlie' };

  const sampleGist: Gist = {
    id: 88,
    title: 'pipeline.py',
    content: 'def run(): pass',
    owner_id: 10,
  };

  const updatedGist: Gist = {
    id: 88,
    title: 'pipeline_v2.py',
    content: 'def run(): print("updated")',
    owner_id: 10,
  };

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

  const renderWorkflowRouter = (initialEntries: string[], initialIndex: number = 0) => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 0 },
        mutations: { retry: false },
      },
    });

    const router = createMemoryRouter(
      [
        {
          path: '/gists',
          element: <div data-testid="my-gists-view">My Gists Listing</div>,
        },
        {
          path: '/gists/:gistId',
          element: <GistDetailPage />,
        },
        {
          path: '/gists/:gistId/edit',
          element: <EditGistPage />,
        },
      ],
      { initialEntries, initialIndex }
    );

    const renderResult = render(
      <QueryClientProvider client={qc}>
        <ThemeProvider>
          <NotificationProvider>
            <RouterProvider router={router} />
          </NotificationProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );

    return { router, qc, ...renderResult };
  };

  // 1. Detail → Edit → Save → Back
  it('Detail -> Edit -> Save -> Back does not loop back to the Edit page', async () => {
    vi.spyOn(gistService, 'getGistById').mockResolvedValue(sampleGist);
    const updateSpy = vi.spyOn(gistService, 'updateGist').mockResolvedValue(updatedGist);

    // Initial history: user was on /gists, then navigated to /gists/88
    const { router } = renderWorkflowRouter(['/gists', '/gists/88'], 1);

    // 1. Detail page is loaded
    expect(await screen.findByRole('heading', { name: 'pipeline.py' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/gists/88');

    // 2. Click "Edit"
    const editBtn = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editBtn);

    // 3. User is now on Edit page
    expect(await screen.findByText('Edit Gist')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/gists/88/edit');

    // 4. Update title and save
    const titleInput = screen.getByLabelText(/gist title/i);
    fireEvent.change(titleInput, { target: { value: 'pipeline_v2.py' } });
    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(88, {
        title: 'pipeline_v2.py',
        content: 'def run(): pass',
      });
    });

    // 5. Returned to Gist detail view
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/gists/88');
    });

    // 6. Pressing browser Back
    router.navigate(-1);

    // 7. Should go back to /gists (previous flow), NOT /gists/88/edit
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/gists');
      expect(screen.getByTestId('my-gists-view')).toBeInTheDocument();
    });
  });

  // 2. Detail → Edit → Cancel → Back
  it('Detail -> Edit -> Cancel -> Back returns to previous page without reopening Edit', async () => {
    vi.spyOn(gistService, 'getGistById').mockResolvedValue(sampleGist);

    const { router } = renderWorkflowRouter(['/gists', '/gists/88'], 1);

    // 1. On Detail page
    expect(await screen.findByRole('heading', { name: 'pipeline.py' })).toBeInTheDocument();

    // 2. Click "Edit"
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    // 3. On Edit page
    expect(await screen.findByText('Edit Gist')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/gists/88/edit');

    // 4. Click "Cancel"
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    // 5. Returned to Detail page
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/gists/88');
    });

    // 6. Pressing browser Back
    router.navigate(-1);

    // 7. Land on /gists, NOT back on /gists/88/edit
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/gists');
      expect(screen.getByTestId('my-gists-view')).toBeInTheDocument();
    });
  });

  // 3. Directly opening the Edit URL → Cancel
  it('directly opening Edit URL -> Cancel replaces history and navigates to Detail page', async () => {
    vi.spyOn(gistService, 'getGistById').mockResolvedValue(sampleGist);

    // Initial history has only the edit page (user typed/pasted the edit URL directly)
    const { router } = renderWorkflowRouter(['/gists/88/edit'], 0);

    expect(await screen.findByText('Edit Gist')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/gists/88/edit');

    // Cancel edit
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    // Navigates to Detail page via replace: true
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/gists/88');
    });

    // Detail page is shown without saved changes
    expect(await screen.findByText('pipeline.py')).toBeInTheDocument();
  });

  // 4. Refreshing the Edit page
  it('refreshing or re-rendering Edit page loads gist correctly and preserves edit flow', async () => {
    vi.spyOn(gistService, 'getGistById').mockResolvedValue(sampleGist);

    const { router, rerender, qc } = renderWorkflowRouter(['/gists/88/edit'], 0);

    expect(await screen.findByDisplayValue('pipeline.py')).toBeInTheDocument();
    expect(screen.getByDisplayValue('def run(): pass')).toBeInTheDocument();

    // Simulate page re-render / reload with same router state
    rerender(
      <QueryClientProvider client={qc}>
        <ThemeProvider>
          <NotificationProvider>
            <RouterProvider router={router} />
          </NotificationProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );

    expect(screen.getByDisplayValue('pipeline.py')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/gists/88/edit');
  });

  // 5. Successful editing still persists updated data
  it('successful editing updates cache and displays updated data on return to detail', async () => {
    let currentGist = sampleGist;
    vi.spyOn(gistService, 'getGistById').mockImplementation(async () => currentGist);
    vi.spyOn(gistService, 'updateGist').mockImplementation(async (_, payload) => {
      currentGist = {
        ...currentGist,
        title: payload.title ?? currentGist.title,
        content: payload.content ?? currentGist.content,
      };
      return updatedGist;
    });

    const { router } = renderWorkflowRouter(['/gists', '/gists/88'], 1);

    expect(await screen.findByText('pipeline.py')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(await screen.findByText('Edit Gist')).toBeInTheDocument();

    const titleInput = screen.getByLabelText(/gist title/i);
    const contentTextarea = screen.getByLabelText(/gist content/i);

    fireEvent.change(titleInput, { target: { value: 'pipeline_v2.py' } });
    fireEvent.change(contentTextarea, { target: { value: 'def run(): print("updated")' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/gists/88');
    });

    // Detail view should render updated values
    expect(await screen.findByText('pipeline_v2.py')).toBeInTheDocument();
    expect(screen.getByText('def run(): print("updated")')).toBeInTheDocument();
  });
});
