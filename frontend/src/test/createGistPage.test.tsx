/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import { TestWrapper } from './testUtils';
import { CreateGistPage } from '@/pages/CreateGistPage';
import * as gistService from '@/services/gists';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('CreateGistPage Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockNavigate.mockReset();
  });

  it('renders form inputs and labels properly', () => {
    render(
      <TestWrapper>
        <CreateGistPage />
      </TestWrapper>
    );

    expect(screen.getByRole('heading', { name: /create new gist/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/gist title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/gist content/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create gist/i })).toBeInTheDocument();
  });

  it('validates required fields and blocks empty submissions', async () => {
    const createSpy = vi.spyOn(gistService, 'createGist');

    render(
      <TestWrapper>
        <CreateGistPage />
      </TestWrapper>
    );

    const form = screen.getByRole('button', { name: /create gist/i }).closest('form')!;
    fireEvent.submit(form);

    expect(screen.getByText('Title is required')).toBeInTheDocument();
    expect(screen.getByText('Content is required')).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('submits valid data, calls API mutation, and navigates on success', async () => {
    const createdGist = {
      id: 88,
      title: 'main.py',
      content: "print('Success')",
      owner_id: 1,
    };
    const createSpy = vi.spyOn(gistService, 'createGist').mockResolvedValueOnce(createdGist);

    render(
      <TestWrapper>
        <CreateGistPage />
      </TestWrapper>
    );

    const titleInput = screen.getByLabelText(/gist title/i);
    const contentTextarea = screen.getByLabelText(/gist content/i);
    const submitBtn = screen.getByRole('button', { name: /create gist/i });

    fireEvent.change(titleInput, { target: { value: 'main.py' } });
    fireEvent.change(contentTextarea, { target: { value: "print('Success')" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        title: 'main.py',
        content: "print('Success')",
      });
      expect(mockNavigate).toHaveBeenCalledWith('/gists/88');
    });
  });

  it('displays API error banner and notification on creation failure', async () => {
    const headers = new AxiosHeaders();
    const config = { headers };
    const mockAxiosError = new AxiosError(
      'Request failed with status code 400',
      'ERR_BAD_REQUEST',
      config,
      {},
      {
        status: 400,
        statusText: 'Bad Request',
        data: { detail: 'Title already exists' },
        headers: {},
        config,
      }
    );
    vi.spyOn(gistService, 'createGist').mockRejectedValueOnce(mockAxiosError);

    render(
      <TestWrapper>
        <CreateGistPage />
      </TestWrapper>
    );

    fireEvent.change(screen.getByLabelText(/gist title/i), { target: { value: 'dup.py' } });
    fireEvent.change(screen.getByLabelText(/gist content/i), { target: { value: 'dup content' } });
    const form = screen.getByRole('button', { name: /create gist/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getAllByText('Title already exists').length).toBeGreaterThanOrEqual(1);
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
