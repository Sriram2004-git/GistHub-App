/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import * as authContext from '@/contexts/AuthContext';
import { EditGistPage } from '@/pages/EditGistPage';
import * as gistService from '@/services/gists';
import type { Gist } from '@/types/gist';

// ── Shared mocks ──────────────────────────────────────────────────────────────

let mockParams = { gistId: '55' };
let mockLocation: { state: any } = { state: null };
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

const mockUser = { id: 10, username: 'bob' };

const createWrapper = (queryClient?: QueryClient) => {
  const qc = queryClient ?? new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
  return Wrapper;
};

describe('EditGistPage Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockNavigate.mockReset();
    mockParams = { gistId: '55' };
    mockLocation = { state: null };
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

  it('prepopulates form fields with existing gist data', async () => {
    const existingGist: Gist = {
      id: 55,
      title: 'original_name.py',
      content: 'x = 100',
      owner_id: 10,
    };
    vi.spyOn(gistService, 'getGistById').mockResolvedValueOnce(existingGist);

    const Wrapper = createWrapper();
    render(<EditGistPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByDisplayValue('original_name.py')).toBeInTheDocument();
      expect(screen.getByDisplayValue('x = 100')).toBeInTheDocument();
    });
  });

  it('direct navigation: submits updated values, calls API mutation, and navigates with replace: true', async () => {
    mockLocation = { state: null };
    const existingGist: Gist = {
      id: 55,
      title: 'original.py',
      content: 'old content',
      owner_id: 10,
    };
    const updatedGist: Gist = {
      id: 55,
      title: 'updated.py',
      content: 'new content',
      owner_id: 10,
    };

    vi.spyOn(gistService, 'getGistById').mockResolvedValueOnce(existingGist);
    const updateSpy = vi.spyOn(gistService, 'updateGist').mockResolvedValueOnce(updatedGist);

    const Wrapper = createWrapper();
    render(<EditGistPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByDisplayValue('original.py')).toBeInTheDocument();
    });

    const titleInput = screen.getByLabelText(/gist title/i);
    const contentTextarea = screen.getByLabelText(/gist content/i);
    const saveBtn = screen.getByRole('button', { name: /save changes/i });

    fireEvent.change(titleInput, { target: { value: 'updated.py' } });
    fireEvent.change(contentTextarea, { target: { value: 'new content' } });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(55, {
        title: 'updated.py',
        content: 'new content',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/gists/55', { replace: true });
    });
  });

  it('navigated from detail: submits updated values and pops history with navigate(-1)', async () => {
    mockLocation = { state: { fromDetail: true } };
    const existingGist: Gist = {
      id: 55,
      title: 'original.py',
      content: 'old content',
      owner_id: 10,
    };
    const updatedGist: Gist = {
      id: 55,
      title: 'updated.py',
      content: 'new content',
      owner_id: 10,
    };

    vi.spyOn(gistService, 'getGistById').mockResolvedValueOnce(existingGist);
    vi.spyOn(gistService, 'updateGist').mockResolvedValueOnce(updatedGist);

    const Wrapper = createWrapper();
    render(<EditGistPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByDisplayValue('original.py')).toBeInTheDocument();
    });

    const titleInput = screen.getByLabelText(/gist title/i);
    const saveBtn = screen.getByRole('button', { name: /save changes/i });

    fireEvent.change(titleInput, { target: { value: 'updated.py' } });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  it('direct navigation: cancel button navigates to detail with replace: true', async () => {
    mockLocation = { state: null };
    const existingGist: Gist = {
      id: 55,
      title: 'original.py',
      content: 'old content',
      owner_id: 10,
    };
    vi.spyOn(gistService, 'getGistById').mockResolvedValueOnce(existingGist);

    const Wrapper = createWrapper();
    render(<EditGistPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByDisplayValue('original.py')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/gists/55', { replace: true });
  });

  it('navigated from detail: cancel button calls navigate(-1) to leave edit flow', async () => {
    mockLocation = { state: { fromDetail: true } };
    const existingGist: Gist = {
      id: 55,
      title: 'original.py',
      content: 'old content',
      owner_id: 10,
    };
    vi.spyOn(gistService, 'getGistById').mockResolvedValueOnce(existingGist);

    const Wrapper = createWrapper();
    render(<EditGistPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByDisplayValue('original.py')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('direct navigation: back button in header navigates to detail with replace: true', async () => {
    mockLocation = { state: null };
    const existingGist: Gist = {
      id: 55,
      title: 'my.py',
      content: 'stuff',
      owner_id: 10,
    };
    vi.spyOn(gistService, 'getGistById').mockResolvedValueOnce(existingGist);

    const Wrapper = createWrapper();
    render(<EditGistPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByDisplayValue('my.py')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/back to gist/i));
    expect(mockNavigate).toHaveBeenCalledWith('/gists/55', { replace: true });
  });

  it('blocks non-owner from accessing editing interface', async () => {
    const sharedGist: Gist = {
      id: 55,
      title: 'someone_else_gist.py',
      content: 'secret',
      owner_id: 999, // different from user bob (id: 10)
    };
    vi.spyOn(gistService, 'getGistById').mockResolvedValueOnce(sharedGist);

    const Wrapper = createWrapper();
    render(<EditGistPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Editing Not Allowed')).toBeInTheDocument();
    });
    expect(screen.getByText(/only the creator of this gist is permitted to modify it/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
  });

  it('prevents saving empty title or content', async () => {
    const existingGist: Gist = {
      id: 55,
      title: 'original.py',
      content: 'old content',
      owner_id: 10,
    };
    vi.spyOn(gistService, 'getGistById').mockResolvedValueOnce(existingGist);
    const updateSpy = vi.spyOn(gistService, 'updateGist');

    const Wrapper = createWrapper();
    render(<EditGistPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByDisplayValue('original.py')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/gist title/i), { target: { value: '' } });
    const form = screen.getByRole('button', { name: /save changes/i }).closest('form')!;
    fireEvent.submit(form);

    expect(screen.getByText('Title cannot be empty')).toBeInTheDocument();
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
