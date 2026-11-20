/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { MobileNav } from '@/components/layout/MobileNav';
import { ThemeProvider } from '@/contexts/ThemeContext';
import * as authContext from '@/contexts/AuthContext';

const MobileNavTestHarness: React.FC<{ initialOpen?: boolean }> = ({ initialOpen = false }) => {
  const [isOpen, setIsOpen] = useState(initialOpen);

  return (
    <ThemeProvider>
      <MemoryRouter>
        <button data-testid="mobile-menu-trigger" onClick={() => setIsOpen(true)}>
          Open Menu
        </button>
        <MobileNav
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onCreateGistClick={vi.fn()}
        />
      </MemoryRouter>
    </ThemeProvider>
  );
};

describe('MobileNav Accessibility and Interaction', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      user: { id: 1, username: 'testuser' },
      token: 'jwt-mock',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
  });

  it('opens and traps focus, and restores focus on close', async () => {
    render(<MobileNavTestHarness />);

    const trigger = screen.getByTestId('mobile-menu-trigger');
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /mobile navigation/i })).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog', { name: /mobile navigation/i });
    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true);
    });

    // Close on Escape
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /mobile navigation/i })).not.toBeInTheDocument();
    });

    expect(document.activeElement).toBe(trigger);
  });

  it('closes when clicking backdrop', async () => {
    render(<MobileNavTestHarness initialOpen={true} />);

    expect(screen.getByRole('dialog', { name: /mobile navigation/i })).toBeInTheDocument();

    const backdrop = document.querySelector('.bg-slate-900\\/60');
    expect(backdrop).toBeInTheDocument();
    if (backdrop) {
      fireEvent.click(backdrop);
    }

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /mobile navigation/i })).not.toBeInTheDocument();
    });
  });

  it('closes when navigating via any navigation link', async () => {
    render(<MobileNavTestHarness initialOpen={true} />);

    const myGistsLink = screen.getByRole('link', { name: /my gists/i });
    fireEvent.click(myGistsLink);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /mobile navigation/i })).not.toBeInTheDocument();
    });
  });
});
