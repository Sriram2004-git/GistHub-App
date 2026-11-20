/// <reference types="@testing-library/jest-dom/vitest" />
import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { GistEditor, SUPPORTED_LANGUAGES, detectLanguageFromTitle } from '@/components/gists/GistEditor';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { CreateGistPage } from '@/pages/CreateGistPage';
import { EditGistPage } from '@/pages/EditGistPage';
import { GistDetailPage } from '@/pages/GistDetailPage';
import * as gistService from '@/services/gists';
import * as authContext from '@/contexts/AuthContext';
import type { Gist } from '@/types/gist';

// Helper component to test theme toggling with GistEditor
const ThemeToggleTestComponent: React.FC<{ initialContent?: string }> = ({
  initialContent = 'console.log("hello");',
}) => {
  const { toggleTheme, effectiveTheme } = useTheme();
  const [content, setContent] = useState(initialContent);

  return (
    <div>
      <button onClick={toggleTheme}>Toggle Theme (Current: {effectiveTheme})</button>
      <GistEditor value={content} onChange={setContent} label="Code Area" />
    </div>
  );
};

// Controlled editor test harness
const ControlledEditorHarness: React.FC<{
  initialValue?: string;
  onValueChange?: (val: string) => void;
  titleHint?: string;
  readOnly?: boolean;
  height?: string | number;
}> = ({
  initialValue = 'initial content',
  onValueChange,
  titleHint,
  readOnly = false,
  height,
}) => {
  const [val, setVal] = useState(initialValue);
  return (
    <div>
      <span data-testid="current-value">{val}</span>
      <GistEditor
        value={val}
        onChange={(newVal) => {
          setVal(newVal);
          onValueChange?.(newVal);
        }}
        titleHint={titleHint}
        readOnly={readOnly}
        height={height}
        label="Test Editor"
      />
    </div>
  );
};

// Helper to render router-based pages with QueryClient & Providers
const renderWithRouter = (element: React.ReactElement, path: string, entry: string) => {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const router = createMemoryRouter(
    [
      {
        path,
        element,
      },
      {
        path: '/gists',
        element: <div data-testid="my-gists">My Gists</div>,
      },
    ],
    { initialEntries: [entry] }
  );

  return render(
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <NotificationProvider>
          <RouterProvider router={router} />
        </NotificationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('GistEditor Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Language utility detection
  describe('Language Detection', () => {
    it('detects supported languages correctly from titles/extensions', () => {
      expect(detectLanguageFromTitle('index.js')).toBe('javascript');
      expect(detectLanguageFromTitle('App.tsx')).toBe('typescript');
      expect(detectLanguageFromTitle('main.py')).toBe('python');
      expect(detectLanguageFromTitle('Main.java')).toBe('java');
      expect(detectLanguageFromTitle('program.c')).toBe('c');
      expect(detectLanguageFromTitle('program.cpp')).toBe('cpp');
      expect(detectLanguageFromTitle('index.html')).toBe('html');
      expect(detectLanguageFromTitle('style.css')).toBe('css');
      expect(detectLanguageFromTitle('config.json')).toBe('json');
      expect(detectLanguageFromTitle('README.md')).toBe('markdown');
      expect(detectLanguageFromTitle('query.sql')).toBe('sql');
      expect(detectLanguageFromTitle('deploy.yaml')).toBe('yaml');
      expect(detectLanguageFromTitle('deploy.yml')).toBe('yaml');
      expect(detectLanguageFromTitle('notes.txt')).toBe('plaintext');
      expect(detectLanguageFromTitle('unknown_file')).toBe('plaintext');
      expect(detectLanguageFromTitle('')).toBe('plaintext');
    });

    it('contains all 13 required supported languages in SUPPORTED_LANGUAGES', () => {
      const languageValues = SUPPORTED_LANGUAGES.map((l) => l.value);
      const expected = [
        'plaintext',
        'javascript',
        'typescript',
        'python',
        'java',
        'c',
        'cpp',
        'html',
        'css',
        'json',
        'markdown',
        'sql',
        'yaml',
      ];
      expected.forEach((lang) => {
        expect(languageValues).toContain(lang);
      });
      expect(SUPPORTED_LANGUAGES.length).toBe(13);
    });
  });

  // 2. Controlled editor content
  describe('Controlled Editor Content', () => {
    it('renders initial value and updates value when onChange is triggered', () => {
      const handleChange = vi.fn();
      render(
        <ThemeProvider>
          <ControlledEditorHarness
            initialValue="hello world"
            onValueChange={handleChange}
          />
        </ThemeProvider>
      );

      const textarea = screen.getByLabelText(/test editor/i);
      expect(textarea).toHaveValue('hello world');
      expect(screen.getByTestId('current-value')).toHaveTextContent('hello world');

      fireEvent.change(textarea, { target: { value: 'updated code snippet' } });

      expect(textarea).toHaveValue('updated code snippet');
      expect(screen.getByTestId('current-value')).toHaveTextContent('updated code snippet');
      expect(handleChange).toHaveBeenCalledWith('updated code snippet');
    });
  });

  // 3. Language selection
  describe('Language Selection and Auto-detection', () => {
    it('defaults to plaintext when no titleHint or language is provided', () => {
      render(
        <ThemeProvider>
          <GistEditor value="some code" onChange={() => {}} />
        </ThemeProvider>
      );

      const select = screen.getByLabelText(/language selection/i) as HTMLSelectElement;
      expect(select.value).toBe('plaintext');
    });

    it('auto-detects language from titleHint', () => {
      render(
        <ThemeProvider>
          <GistEditor value="print('hello')" titleHint="script.py" onChange={() => {}} />
        </ThemeProvider>
      );

      const select = screen.getByLabelText(/language selection/i) as HTMLSelectElement;
      expect(select.value).toBe('python');
    });

    it('allows user to manually change language via dropdown', () => {
      const handleLanguageChange = vi.fn();
      render(
        <ThemeProvider>
          <GistEditor
            value="const x = 10;"
            onLanguageChange={handleLanguageChange}
            onChange={() => {}}
          />
        </ThemeProvider>
      );

      const select = screen.getByLabelText(/language selection/i);
      fireEvent.change(select, { target: { value: 'typescript' } });

      expect(select).toHaveValue('typescript');
      expect(handleLanguageChange).toHaveBeenCalledWith('typescript');
    });
  });

  // 4. Theme integration
  describe('Theme Integration', () => {
    it('sets initial theme (vs-dark or light) and updates mounted editor upon theme switch', () => {
      render(
        <ThemeProvider>
          <ThemeToggleTestComponent />
        </ThemeProvider>
      );

      const editorContainer = screen.getByTestId('monaco-editor');
      expect(editorContainer).toHaveAttribute('data-theme', 'light');

      // Click toggle
      const toggleBtn = screen.getByRole('button', { name: /toggle theme/i });
      fireEvent.click(toggleBtn);

      // Now effectiveTheme should be dark -> Monaco theme vs-dark
      expect(editorContainer).toHaveAttribute('data-theme', 'vs-dark');

      // Toggle back to light
      fireEvent.click(toggleBtn);
      expect(editorContainer).toHaveAttribute('data-theme', 'light');
    });
  });

  // 5. Read-only mode
  describe('Read-Only Mode', () => {
    it('renders editor in read-only mode when readOnly prop is true', () => {
      render(
        <ThemeProvider>
          <GistEditor value="read only text" readOnly={true} onChange={() => {}} />
        </ThemeProvider>
      );

      const textarea = screen.getByLabelText(/gist content/i);
      expect(textarea).toHaveAttribute('readonly');
      expect(textarea).toBeDisabled();
    });
  });

  // 6. Configurable height
  describe('Configurable Height & Responsive Layout', () => {
    it('applies configured height style to editor container', () => {
      render(
        <ThemeProvider>
          <GistEditor value="code" height="520px" onChange={() => {}} />
        </ThemeProvider>
      );

      const wrapper = screen.getByTestId('gist-editor-wrapper');
      expect(wrapper).toHaveStyle({ height: '520px' });
    });
  });

  // 7. Error and Helper text
  describe('Accessible Labels & Errors', () => {
    it('renders error message with role="alert" when error prop is provided', () => {
      render(
        <ThemeProvider>
          <GistEditor
            value=""
            error="Content cannot be empty"
            helperText="Code description"
            onChange={() => {}}
          />
        </ThemeProvider>
      );

      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toHaveTextContent('Content cannot be empty');
      expect(screen.queryByText('Code description')).not.toBeInTheDocument();
    });

    it('renders helperText when error is not present', () => {
      render(
        <ThemeProvider>
          <GistEditor
            value="abc"
            helperText="3 characters"
            onChange={() => {}}
          />
        </ThemeProvider>
      );

      expect(screen.getByText('3 characters')).toBeInTheDocument();
    });
  });
});

describe('Page Integration with Monaco Editor', () => {
  const mockUser = { id: 10, username: 'testuser' };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      user: mockUser,
      token: 'jwt-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
  });

  // Create page integration
  it('CreateGistPage integrates Monaco editor for content input', async () => {
    renderWithRouter(<CreateGistPage />, '/gists/new', '/gists/new');

    const titleInput = screen.getByLabelText(/gist title/i);
    const editor = screen.getByLabelText(/gist content/i);

    fireEvent.change(titleInput, { target: { value: 'service.ts' } });
    fireEvent.change(editor, { target: { value: 'export const run = () => {};' } });

    expect(titleInput).toHaveValue('service.ts');
    expect(editor).toHaveValue('export const run = () => {};');

    // Language selector automatically detected typescript
    const langSelect = screen.getByLabelText(/language selection/i) as HTMLSelectElement;
    expect(langSelect.value).toBe('typescript');
  });

  // Edit page integration
  it('EditGistPage integrates Monaco editor prefilled with existing content', async () => {
    const existingGist: Gist = {
      id: 77,
      title: 'app.py',
      content: 'import fastapi',
      owner_id: 10,
    };
    vi.spyOn(gistService, 'getGistById').mockResolvedValueOnce(existingGist);

    renderWithRouter(<EditGistPage />, '/gists/:gistId/edit', '/gists/77/edit');

    await waitFor(() => {
      expect(screen.getByDisplayValue('app.py')).toBeInTheDocument();
      expect(screen.getByDisplayValue('import fastapi')).toBeInTheDocument();
    });

    const langSelect = screen.getByLabelText(/language selection/i) as HTMLSelectElement;
    expect(langSelect.value).toBe('python');
  });

  // Detail page read-only mode for owner
  it('GistDetailPage renders Monaco editor in read-only mode for owner with edit/delete actions', async () => {
    const ownerGist: Gist = {
      id: 42,
      title: 'config.json',
      content: '{"port": 8080}',
      owner_id: 10, // matches mockUser (id: 10)
    };
    vi.spyOn(gistService, 'getGistById').mockResolvedValueOnce(ownerGist);

    renderWithRouter(<GistDetailPage />, '/gists/:gistId', '/gists/42');

    await waitFor(() => {
      expect(screen.getByText('{"port": 8080}')).toBeInTheDocument();
    });

    // Content is read-only
    const editor = screen.getByLabelText(/gist content/i);
    expect(editor).toHaveAttribute('readonly');

    // Actions for owner are visible
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy content/i })).toBeInTheDocument();
  });

  // Detail page read-only mode for shared recipient
  it('GistDetailPage renders Monaco editor in read-only mode and restricts actions for shared recipient', async () => {
    const sharedGist: Gist = {
      id: 99,
      title: 'shared_query.sql',
      content: 'SELECT * FROM users;',
      owner_id: 999, // different from mockUser (id: 10)
    };
    vi.spyOn(gistService, 'getGistById').mockResolvedValueOnce(sharedGist);

    renderWithRouter(<GistDetailPage />, '/gists/:gistId', '/gists/99');

    await waitFor(() => {
      expect(screen.getByText('SELECT * FROM users;')).toBeInTheDocument();
    });

    // Read only badge present
    expect(screen.getByText(/shared with you \(read only\)/i)).toBeInTheDocument();

    // Editor is read only
    const editor = screen.getByLabelText(/gist content/i);
    expect(editor).toHaveAttribute('readonly');

    // Edit/Delete buttons are hidden for non-owner
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    // Copy content is available
    expect(screen.getByRole('button', { name: /copy content/i })).toBeInTheDocument();
  });
});
