import React from 'react';
import '@testing-library/jest-dom';
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Standard mock for window.matchMedia in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock for @monaco-editor/react using React.createElement for TS compatibility
vi.mock('@monaco-editor/react', () => {
  const MockEditor = ({
    value,
    onChange,
    theme,
    language,
    options,
    id,
    wrapperProps,
    'aria-label': ariaLabel,
    ...props
  }: any) => {
    return React.createElement(
      'div',
      {
        'data-testid': 'monaco-editor',
        'data-theme': theme,
        'data-language': language,
        className: 'monaco-editor-mock',
      },
      React.createElement('textarea', {
        id: id || wrapperProps?.id || props.id,
        'aria-label': ariaLabel || 'Gist Content',
        value: value ?? '',
        readOnly: options?.readOnly,
        disabled: options?.readOnly,
        onChange: (e: any) => onChange && onChange(e.target.value),
        'data-theme': theme,
        'data-language': language,
      })
    );
  };

  return {
    default: MockEditor,
    Editor: MockEditor,
    useMonaco: () => null,
    loader: {
      config: vi.fn(),
      init: vi.fn().mockResolvedValue({}),
    },
  };
});
