/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { authService } from '@/services/auth';
import { TOKEN_STORAGE_KEY } from '@/lib/api';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { AppRoutes } from '@/routes/AppRoutes';

const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const AllProviders: React.FC<{ children: React.ReactNode; initialEntries?: string[] }> = ({
  children,
  initialEntries = ['/'],
}) => (
  <QueryClientProvider client={testQueryClient}>
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

describe('GistHub Authentication Workflow', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // 1. Token persistence
  it('persists token to localStorage under gisthub_access_token key', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'test-token-xyz');
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('test-token-xyz');
  });

  // 2. Login success
  it('authenticates user and stores token on login success', async () => {
    vi.spyOn(authService, 'login').mockResolvedValueOnce({
      access_token: 'fake-jwt-token',
      token_type: 'bearer',
    });
    vi.spyOn(authService, 'getCurrentUser').mockResolvedValueOnce({
      id: 101,
      username: 'johndoe',
    });

    const TestComponent = () => {
      const { user, isAuthenticated, login } = useAuth();
      return (
        <div>
          <button onClick={() => login({ username: 'johndoe', password: 'password123' })}>
            Log in
          </button>
          <div data-testid="auth-status">{isAuthenticated ? 'logged-in' : 'logged-out'}</div>
          <div data-testid="auth-user">{user?.username}</div>
        </div>
      );
    };

    render(
      <AllProviders>
        <TestComponent />
      </AllProviders>
    );

    const button = screen.getByText('Log in');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('logged-in');
      expect(screen.getByTestId('auth-user').textContent).toBe('johndoe');
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('fake-jwt-token');
    });
  });

  // 3. Login failure alert on LoginPage UI
  it('displays user-friendly error message on login failure', async () => {
    vi.spyOn(authService, 'login').mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 401, data: { detail: 'Invalid username or password' } },
    });

    render(
      <AllProviders>
        <LoginPage />
      </AllProviders>
    );

    const usernameInput = screen.getByLabelText(/Username/i);
    const passwordInput = screen.getByPlaceholderText('••••••••');
    const submitBtn = screen.getByRole('button', { name: /Sign In/i });

    fireEvent.change(usernameInput, { target: { value: 'baduser' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText('Invalid username or password. Please try again.')
    ).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });

  // 4. Registration success
  it('calls authService.register successfully and navigates to login with confirmation', async () => {
    vi.spyOn(authService, 'register').mockResolvedValueOnce({
      id: 999,
      username: 'registered_dev',
    });

    render(
      <AllProviders initialEntries={['/register']}>
        <AppRoutes />
      </AllProviders>
    );

    const usernameInput = screen.getByLabelText(/Username/i);
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    const submitBtn = screen.getByRole('button', { name: /Create Account/i });

    fireEvent.change(usernameInput, { target: { value: 'registered_dev' } });
    fireEvent.change(passwordInputs[0], { target: { value: 'securePass123' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'securePass123' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authService.register).toHaveBeenCalledWith({
        username: 'registered_dev',
        password: 'securePass123',
      });
      // Should redirect to login page with success message
      expect(screen.getByText('Sign in to GistHub')).toBeInTheDocument();
      expect(
        screen.getByText('Account created successfully! Please sign in with your credentials.')
      ).toBeInTheDocument();
    });
  });

  // 5. Registration password mismatch validation
  it('displays validation error when passwords do not match during registration', async () => {
    render(
      <AllProviders>
        <RegisterPage />
      </AllProviders>
    );

    const usernameInput = screen.getByLabelText(/Username/i);
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    const submitBtn = screen.getByRole('button', { name: /Create Account/i });

    fireEvent.change(usernameInput, { target: { value: 'newuser' } });
    fireEvent.change(passwordInputs[0], { target: { value: 'password123' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'mismatchedPassword' } });

    fireEvent.click(submitBtn);

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
  });

  // 6. Session restoration after refresh
  it('restores session after refresh when valid token is in localStorage', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'existing-valid-jwt');
    vi.spyOn(authService, 'getCurrentUser').mockResolvedValueOnce({
      id: 202,
      username: 'alice',
    });

    const TestComponent = () => {
      const { user, isAuthenticated, isLoading } = useAuth();
      if (isLoading) return <div>Loading...</div>;
      return (
        <div>
          <span data-testid="user">{user?.username}</span>
          <span data-testid="auth">{isAuthenticated ? 'yes' : 'no'}</span>
        </div>
      );
    };

    render(
      <AllProviders>
        <TestComponent />
      </AllProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('alice');
      expect(screen.getByTestId('auth').textContent).toBe('yes');
    });
  });

  // 7. Invalid token handling on startup
  it('clears token from storage when session restoration receives 401', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'expired-or-invalid-jwt');
    vi.spyOn(authService, 'getCurrentUser').mockRejectedValueOnce({
      response: { status: 401 },
    });

    const TestComponent = () => {
      const { isAuthenticated, isLoading } = useAuth();
      if (isLoading) return <div>Loading...</div>;
      return <div data-testid="auth">{isAuthenticated ? 'yes' : 'no'}</div>;
    };

    render(
      <AllProviders>
        <TestComponent />
      </AllProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth').textContent).toBe('no');
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    });
  });

  // 8. Protected route redirects unauthenticated user to /login
  it('redirects unauthenticated users from protected routes to /login', async () => {
    render(
      <AllProviders initialEntries={['/']}>
        <AppRoutes />
      </AllProviders>
    );

    // Should redirect to /login and render login view
    expect(await screen.findByText('Sign in to GistHub')).toBeInTheDocument();
  });

  // 9. Authenticated users visiting /login are redirected to /
  it('redirects authenticated users away from /login to protected home view', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'valid-token');
    vi.spyOn(authService, 'getCurrentUser').mockResolvedValueOnce({
      id: 404,
      username: 'authenticated_user',
    });

    render(
      <AllProviders initialEntries={['/login']}>
        <AppRoutes />
      </AllProviders>
    );

    // Should redirect to / and render Overview
    expect(await screen.findByText('Welcome to GistHub')).toBeInTheDocument();
    expect(screen.getByText('authenticated_user')).toBeInTheDocument();
  });

  // 10. Logout clears session and redirects
  it('clears token and user on logout and redirects to /login', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'active-session-token');
    vi.spyOn(authService, 'getCurrentUser').mockResolvedValueOnce({
      id: 303,
      username: 'carol',
    });

    const TestComponent = () => {
      const { user, isAuthenticated, logout, isLoading } = useAuth();
      if (isLoading) return <div>Loading...</div>;
      return (
        <div>
          <span data-testid="user">{user?.username || 'none'}</span>
          <span data-testid="auth">{isAuthenticated ? 'yes' : 'no'}</span>
          <button onClick={logout}>Sign out</button>
        </div>
      );
    };

    render(
      <AllProviders>
        <TestComponent />
      </AllProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth').textContent).toBe('yes');
    });

    fireEvent.click(screen.getByText('Sign out'));

    await waitFor(() => {
      expect(screen.getByTestId('auth').textContent).toBe('no');
      expect(screen.getByTestId('user').textContent).toBe('none');
      expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    });
  });

  // 11. Sidebar displays the authenticated username
  it('displays the authenticated username in the sidebar', async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'valid-token');
    vi.spyOn(authService, 'getCurrentUser').mockResolvedValueOnce({
      id: 505,
      username: 'octocat',
    });

    render(
      <AllProviders initialEntries={['/']}>
        <AppRoutes />
      </AllProviders>
    );

    expect(await screen.findByText('octocat')).toBeInTheDocument();
    expect(screen.getByText('Active session')).toBeInTheDocument();
  });
});
