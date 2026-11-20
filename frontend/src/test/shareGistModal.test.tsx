/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TestWrapper } from './testUtils';
import { ShareGistModal } from '@/components/gists/ShareGistModal';
import { GistDetailPage } from '@/pages/GistDetailPage';
import * as authContext from '@/contexts/AuthContext';
import * as authServiceModule from '@/services/auth';
import * as gistService from '@/services/gists';
import type { Gist } from '@/types/gist';
import type { User } from '@/types/auth';

// ─────────────────────────────────────────────────────────────────────────────
// Router mock
// ─────────────────────────────────────────────────────────────────────────────
let mockParams = { gistId: '10' };
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => vi.fn(),
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Shared fixtures
// ─────────────────────────────────────────────────────────────────────────────
const mockOwner: User = { id: 1, username: 'alice' };
const mockRecipient: User = { id: 2, username: 'bob' };

const sampleGist: Gist = {
  id: 10,
  title: 'my-script.py',
  content: 'print("hello")',
  owner_id: 1,
};

function setupOwnerAuth() {
  vi.spyOn(authContext, 'useAuth').mockReturnValue({
    user: mockOwner,
    token: 'jwt',
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1: Modal open / close behaviour
// ─────────────────────────────────────────────────────────────────────────────
describe('ShareGistModal — open/close behaviour', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setupOwnerAuth();
  });

  it('renders the modal when isOpen is true', () => {
    render(
      <TestWrapper>
        <ShareGistModal gist={sampleGist} isOpen={true} onClose={vi.fn()} />
      </TestWrapper>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Share Gist')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <TestWrapper>
        <ShareGistModal gist={sampleGist} isOpen={false} onClose={vi.fn()} />
      </TestWrapper>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders nothing when gist is null', () => {
    render(
      <TestWrapper>
        <ShareGistModal gist={null} isOpen={true} onClose={vi.fn()} />
      </TestWrapper>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when Cancel button is clicked', () => {
    const onClose = vi.fn();
    render(
      <TestWrapper>
        <ShareGistModal gist={sampleGist} isOpen={true} onClose={onClose} />
      </TestWrapper>
    );
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when the X close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <TestWrapper>
        <ShareGistModal gist={sampleGist} isOpen={true} onClose={onClose} />
      </TestWrapper>
    );
    fireEvent.click(screen.getByRole('button', { name: /close dialog/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows the gist title in the modal description', () => {
    render(
      <TestWrapper>
        <ShareGistModal gist={sampleGist} isOpen={true} onClose={vi.fn()} />
      </TestWrapper>
    );
    expect(screen.getByText(/my-script\.py/)).toBeInTheDocument();
  });

  it('renders username input field and Share button', () => {
    render(
      <TestWrapper>
        <ShareGistModal gist={sampleGist} isOpen={true} onClose={vi.fn()} />
      </TestWrapper>
    );
    expect(screen.getByRole('textbox', { name: /recipient username/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^share$/i })).toBeInTheDocument();
  });

  it('keeps Share button disabled when username input is empty', () => {
    render(
      <TestWrapper>
        <ShareGistModal gist={sampleGist} isOpen={true} onClose={vi.fn()} />
      </TestWrapper>
    );
    expect(screen.getByRole('button', { name: /^share$/i })).toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2: Username lookup (debounced)
// ─────────────────────────────────────────────────────────────────────────────
describe('ShareGistModal — username lookup', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setupOwnerAuth();
  });

  it('shows "Looking up user…" while debounce is in flight', async () => {
    vi.spyOn(authServiceModule.authService, 'lookupUser').mockResolvedValue(mockRecipient);

    render(
      <TestWrapper>
        <ShareGistModal gist={sampleGist} isOpen={true} onClose={vi.fn()} />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox', { name: /recipient username/i });
    fireEvent.change(input, { target: { value: 'bob' } });

    await waitFor(() => {
      expect(screen.getByText(/looking up user/i)).toBeInTheDocument();
    });
  });

  it('shows user confirmed panel when lookup resolves', async () => {
    vi.spyOn(authServiceModule.authService, 'lookupUser').mockResolvedValue(mockRecipient);

    render(
      <TestWrapper>
        <ShareGistModal gist={sampleGist} isOpen={true} onClose={vi.fn()} />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox', { name: /recipient username/i });
    fireEvent.change(input, { target: { value: 'bob' } });

    await waitFor(() => {
      expect(screen.getByText('bob')).toBeInTheDocument();
      expect(screen.getByText(/ready to share/i)).toBeInTheDocument();
    });

    // Share button becomes enabled
    expect(screen.getByRole('button', { name: /^share$/i })).not.toBeDisabled();
  });

  it('shows "No user found" when lookup returns 404', async () => {
    const notFoundError = {
      isAxiosError: true,
      response: { status: 404, data: { detail: 'User not found' } },
    };
    vi.spyOn(authServiceModule.authService, 'lookupUser').mockRejectedValue(notFoundError);

    render(
      <TestWrapper>
        <ShareGistModal gist={sampleGist} isOpen={true} onClose={vi.fn()} />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox', { name: /recipient username/i });
    fireEvent.change(input, { target: { value: 'ghost_user' } });

    await waitFor(() => {
      expect(screen.getByText(/no user found with that username/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /^share$/i })).toBeDisabled();
  });

  it('shows error message on non-404 lookup failure', async () => {
    const serverError = {
      isAxiosError: true,
      response: { status: 500, data: { detail: 'Server error' } },
    };
    vi.spyOn(authServiceModule.authService, 'lookupUser').mockRejectedValue(serverError);

    render(
      <TestWrapper>
        <ShareGistModal gist={sampleGist} isOpen={true} onClose={vi.fn()} />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox', { name: /recipient username/i });
    fireEvent.change(input, { target: { value: 'anyuser' } });

    await waitFor(() => {
      expect(screen.getByText(/internal server error occurred/i)).toBeInTheDocument();
    });
  });

  it('resets lookup state when input is cleared after a find', async () => {
    vi.spyOn(authServiceModule.authService, 'lookupUser').mockResolvedValue(mockRecipient);

    render(
      <TestWrapper>
        <ShareGistModal gist={sampleGist} isOpen={true} onClose={vi.fn()} />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox', { name: /recipient username/i });
    fireEvent.change(input, { target: { value: 'bob' } });

    await waitFor(() => { expect(screen.getByText('bob')).toBeInTheDocument(); });

    // Clear the input
    fireEvent.change(input, { target: { value: '' } });

    await waitFor(() => {
      expect(screen.queryByText(/ready to share/i)).not.toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3: Sharing submission
// ─────────────────────────────────────────────────────────────────────────────
describe('ShareGistModal — sharing submission', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setupOwnerAuth();
  });

  it('calls shareGist with correct arguments on submit', async () => {
    vi.spyOn(authServiceModule.authService, 'lookupUser').mockResolvedValue(mockRecipient);
    const shareSpy = vi.spyOn(gistService, 'shareGist').mockResolvedValue({
      id: 99,
      gist_id: 10,
      recipient_id: 2,
    });

    render(
      <TestWrapper>
        <ShareGistModal gist={sampleGist} isOpen={true} onClose={vi.fn()} />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox', { name: /recipient username/i });
    fireEvent.change(input, { target: { value: 'bob' } });
    await waitFor(() => { expect(screen.getByText(/ready to share/i)).toBeInTheDocument(); });

    fireEvent.click(screen.getByRole('button', { name: /^share$/i }));

    await waitFor(() => {
      expect(shareSpy).toHaveBeenCalledWith(10, { recipient_id: 2 });
    });
  });

  it('shows success state after a successful share', async () => {
    vi.spyOn(authServiceModule.authService, 'lookupUser').mockResolvedValue(mockRecipient);
    vi.spyOn(gistService, 'shareGist').mockResolvedValue({
      id: 99,
      gist_id: 10,
      recipient_id: 2,
    });

    render(
      <TestWrapper>
        <ShareGistModal gist={sampleGist} isOpen={true} onClose={vi.fn()} />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox', { name: /recipient username/i });
    fireEvent.change(input, { target: { value: 'bob' } });
    await waitFor(() => { expect(screen.getByText(/ready to share/i)).toBeInTheDocument(); });

    fireEvent.click(screen.getByRole('button', { name: /^share$/i }));

    await waitFor(() => {
      expect(screen.getByText(/gist shared successfully/i)).toBeInTheDocument();
    });
    // Success state shows recipient username
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  it('shows duplicate share error from the backend', async () => {
    vi.spyOn(authServiceModule.authService, 'lookupUser').mockResolvedValue(mockRecipient);
    const duplicateError = {
      isAxiosError: true,
      response: { status: 400, data: { detail: 'Gist is already shared with this user' } },
    };
    vi.spyOn(gistService, 'shareGist').mockRejectedValue(duplicateError);

    render(
      <TestWrapper>
        <ShareGistModal gist={sampleGist} isOpen={true} onClose={vi.fn()} />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox', { name: /recipient username/i });
    fireEvent.change(input, { target: { value: 'bob' } });
    await waitFor(() => { expect(screen.getByText(/ready to share/i)).toBeInTheDocument(); });

    fireEvent.click(screen.getByRole('button', { name: /^share$/i }));

    await waitFor(() => {
      expect(screen.getByText(/gist is already shared with this user/i)).toBeInTheDocument();
    });
  });

  it('shows self-share error from the backend', async () => {
    const selfUser: User = { id: 1, username: 'alice' };
    vi.spyOn(authServiceModule.authService, 'lookupUser').mockResolvedValue(selfUser);
    const selfError = {
      isAxiosError: true,
      response: { status: 400, data: { detail: 'Cannot share gist with yourself' } },
    };
    vi.spyOn(gistService, 'shareGist').mockRejectedValue(selfError);

    render(
      <TestWrapper>
        <ShareGistModal gist={sampleGist} isOpen={true} onClose={vi.fn()} />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox', { name: /recipient username/i });
    fireEvent.change(input, { target: { value: 'alice' } });
    await waitFor(() => { expect(screen.getByText(/ready to share/i)).toBeInTheDocument(); });

    fireEvent.click(screen.getByRole('button', { name: /^share$/i }));

    await waitFor(() => {
      expect(screen.getByText(/cannot share gist with yourself/i)).toBeInTheDocument();
    });
  });

  it('shows invalid recipient error (backend 404 on share)', async () => {
    vi.spyOn(authServiceModule.authService, 'lookupUser').mockResolvedValue(mockRecipient);
    const recipientNotFound = {
      isAxiosError: true,
      response: { status: 404, data: { detail: 'Recipient user not found' } },
    };
    vi.spyOn(gistService, 'shareGist').mockRejectedValue(recipientNotFound);

    render(
      <TestWrapper>
        <ShareGistModal gist={sampleGist} isOpen={true} onClose={vi.fn()} />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox', { name: /recipient username/i });
    fireEvent.change(input, { target: { value: 'bob' } });
    await waitFor(() => { expect(screen.getByText(/ready to share/i)).toBeInTheDocument(); });

    fireEvent.click(screen.getByRole('button', { name: /^share$/i }));

    await waitFor(() => {
      expect(screen.getByText(/recipient user not found/i)).toBeInTheDocument();
    });
  });

  it('disables Share button while submission is in flight (duplicate-submit protection)', async () => {
    vi.spyOn(authServiceModule.authService, 'lookupUser').mockResolvedValue(mockRecipient);
    // Never resolves — simulates slow network
    vi.spyOn(gistService, 'shareGist').mockReturnValue(new Promise(() => {}));

    render(
      <TestWrapper>
        <ShareGistModal gist={sampleGist} isOpen={true} onClose={vi.fn()} />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox', { name: /recipient username/i });
    fireEvent.change(input, { target: { value: 'bob' } });
    await waitFor(() => { expect(screen.getByText(/ready to share/i)).toBeInTheDocument(); });

    fireEvent.click(screen.getByRole('button', { name: /^share$/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sharing/i })).toBeDisabled();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 4: GistDetailPage integration — owner-only Share access
// ─────────────────────────────────────────────────────────────────────────────
describe('GistDetailPage — Share button visibility and owner-only access', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockParams = { gistId: '10' };
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('shows the Share button to the gist owner', async () => {
    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      user: mockOwner,
      token: 'jwt',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    vi.spyOn(gistService, 'getGistById').mockResolvedValue(sampleGist);

    render(
      <TestWrapper>
        <GistDetailPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^share$/i })).toBeInTheDocument();
    });
  });

  it('does NOT show the Share button to a shared recipient (non-owner)', async () => {
    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      user: mockRecipient, // id: 2 ≠ owner_id: 1
      token: 'jwt',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    vi.spyOn(gistService, 'getGistById').mockResolvedValue(sampleGist);

    render(
      <TestWrapper>
        <GistDetailPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/shared with you \(read only\)/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /^share$/i })).not.toBeInTheDocument();
  });

  it('opens the Share modal when the owner clicks Share', async () => {
    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      user: mockOwner,
      token: 'jwt',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    vi.spyOn(gistService, 'getGistById').mockResolvedValue(sampleGist);

    render(
      <TestWrapper>
        <GistDetailPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^share$/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /^share$/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Share Gist')).toBeInTheDocument();
    });
  });

  it('closes the Share modal via Cancel button', async () => {
    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      user: mockOwner,
      token: 'jwt',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    vi.spyOn(gistService, 'getGistById').mockResolvedValue(sampleGist);

    render(
      <TestWrapper>
        <GistDetailPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^share$/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /^share$/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 5: Query cache invalidation
// ─────────────────────────────────────────────────────────────────────────────
describe('ShareGistModal — cache invalidation after sharing', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setupOwnerAuth();
  });

  it('calls shareGist exactly once after a successful share (confirms mutation ran)', async () => {
    vi.spyOn(authServiceModule.authService, 'lookupUser').mockResolvedValue(mockRecipient);
    const shareSpy = vi.spyOn(gistService, 'shareGist').mockResolvedValue({
      id: 99,
      gist_id: 10,
      recipient_id: 2,
    });

    render(
      <TestWrapper>
        <ShareGistModal gist={sampleGist} isOpen={true} onClose={vi.fn()} />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox', { name: /recipient username/i });
    fireEvent.change(input, { target: { value: 'bob' } });
    await waitFor(() => { expect(screen.getByText(/ready to share/i)).toBeInTheDocument(); });

    fireEvent.click(screen.getByRole('button', { name: /^share$/i }));

    await waitFor(() => {
      expect(screen.getByText(/gist shared successfully/i)).toBeInTheDocument();
    });

    expect(shareSpy).toHaveBeenCalledOnce();
  });
});
