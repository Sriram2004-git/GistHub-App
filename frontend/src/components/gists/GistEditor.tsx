import React, { useState, useEffect, useId, Component, ErrorInfo } from 'react';
import Editor, { EditorProps } from '@monaco-editor/react';
import { useTheme } from '@/contexts/ThemeContext';
import { Code2, AlertCircle } from 'lucide-react';

export interface LanguageOption {
  label: string;
  value: string;
  extensions: string[];
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { label: 'Plain Text', value: 'plaintext', extensions: ['txt', 'text'] },
  { label: 'JavaScript', value: 'javascript', extensions: ['js', 'jsx', 'mjs', 'cjs'] },
  { label: 'TypeScript', value: 'typescript', extensions: ['ts', 'tsx', 'mts', 'cts'] },
  { label: 'Python', value: 'python', extensions: ['py', 'pyw'] },
  { label: 'Java', value: 'java', extensions: ['java'] },
  { label: 'C', value: 'c', extensions: ['c', 'h'] },
  { label: 'C++', value: 'cpp', extensions: ['cpp', 'cc', 'cxx', 'hpp', 'hh'] },
  { label: 'HTML', value: 'html', extensions: ['html', 'htm'] },
  { label: 'CSS', value: 'css', extensions: ['css', 'scss', 'less'] },
  { label: 'JSON', value: 'json', extensions: ['json'] },
  { label: 'Markdown', value: 'markdown', extensions: ['md', 'markdown'] },
  { label: 'SQL', value: 'sql', extensions: ['sql'] },
  { label: 'YAML', value: 'yaml', extensions: ['yaml', 'yml'] },
];

export function detectLanguageFromTitle(title?: string): string {
  if (!title) return 'plaintext';
  const clean = title.trim().toLowerCase();
  const lastDot = clean.lastIndexOf('.');
  if (lastDot === -1 || lastDot === clean.length - 1) return 'plaintext';
  const ext = clean.slice(lastDot + 1);
  const found = SUPPORTED_LANGUAGES.find((lang) => lang.extensions.includes(ext));
  return found ? found.value : 'plaintext';
}

export interface GistEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  onLanguageChange?: (language: string) => void;
  defaultLanguage?: string;
  titleHint?: string;
  readOnly?: boolean;
  height?: string | number;
  label?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  showLanguageSelector?: boolean;
}

interface EditorErrorBoundaryProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

interface EditorErrorBoundaryState {
  hasError: boolean;
}

class EditorErrorBoundary extends Component<EditorErrorBoundaryProps, EditorErrorBoundaryState> {
  constructor(props: EditorErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): EditorErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Monaco Editor error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const EditorLoadingSkeleton: React.FC = () => (
  <div className="w-full h-full flex flex-col justify-center items-center gap-2 bg-slate-50 dark:bg-slate-900/60 p-4 animate-pulse">
    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
      <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      <span>Loading editor...</span>
    </div>
  </div>
);

export const GistEditor: React.FC<GistEditorProps> = ({
  value,
  onChange,
  language: controlledLanguage,
  onLanguageChange,
  defaultLanguage = 'plaintext',
  titleHint,
  readOnly = false,
  height = '400px',
  label = 'Gist Content',
  error,
  helperText,
  disabled = false,
  id,
  className = '',
  showLanguageSelector = true,
}) => {
  const generatedId = useId();
  const editorId = id || generatedId;
  const languageSelectId = `${editorId}-language`;
  const errorId = `${editorId}-error`;
  const helperId = `${editorId}-helper`;

  const { effectiveTheme } = useTheme();
  const monacoTheme = effectiveTheme === 'dark' ? 'vs-dark' : 'light';

  // Internal language state if not controlled
  const [internalLanguage, setInternalLanguage] = useState<string>(() => {
    if (controlledLanguage) return controlledLanguage;
    if (titleHint) return detectLanguageFromTitle(titleHint);
    return defaultLanguage;
  });

  const [isManuallySelected, setIsManuallySelected] = useState<boolean>(false);

  // If titleHint changes and user hasn't explicitly picked a language, auto-detect
  useEffect(() => {
    if (!controlledLanguage && !isManuallySelected && titleHint) {
      const detected = detectLanguageFromTitle(titleHint);
      setInternalLanguage(detected);
      onLanguageChange?.(detected);
    }
  }, [titleHint, controlledLanguage, isManuallySelected, onLanguageChange]);

  const activeLanguage = controlledLanguage || internalLanguage;

  const handleLanguageChange = (newLanguage: string) => {
    setIsManuallySelected(true);
    setInternalLanguage(newLanguage);
    onLanguageChange?.(newLanguage);
  };

  const editorOptions: EditorProps['options'] = {
    readOnly,
    domReadOnly: readOnly,
    lineNumbers: 'on',
    minimap: { enabled: false },
    wordWrap: 'on',
    fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: 14,
    lineHeight: 22,
    automaticLayout: true,
    scrollBeyondLastLine: false,
    renderLineHighlight: readOnly ? 'none' : 'line',
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    scrollbar: {
      vertical: 'auto',
      horizontal: 'auto',
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
    },
    contextmenu: true,
    tabSize: 2,
    fixedOverflowWidgets: true,
    folding: true,
    glyphMargin: false,
  };

  const renderFallbackTextarea = () => (
    <div className="w-full h-full flex flex-col p-2 bg-slate-50 dark:bg-slate-900">
      <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 mb-2 px-1">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>Monaco Editor failed to load. Using fallback editor.</span>
      </div>
      <textarea
        aria-label={label}
        value={value}
        readOnly={readOnly}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full flex-1 font-mono text-xs p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-slate-800 dark:text-slate-200 resize-none focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
    </div>
  );

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {/* Header bar: Label & Language Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        {label ? (
          <label
            htmlFor={editorId}
            className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
          >
            <Code2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            {label}
          </label>
        ) : <div />}

        {showLanguageSelector && (
          <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
            <label
              htmlFor={languageSelectId}
              className="text-[11px] font-medium text-slate-500 dark:text-slate-400"
            >
              Language:
            </label>
            <select
              id={languageSelectId}
              aria-label="Language selection"
              value={activeLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              disabled={disabled}
              className="text-xs py-1 px-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Editor Container */}
      <div
        data-testid="gist-editor-wrapper"
        aria-invalid={!!error}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={`w-full rounded-lg border overflow-hidden transition-colors ${
          error
            ? 'border-red-500 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500'
            : 'border-slate-300 dark:border-slate-700 focus-within:border-brand-500 dark:focus-within:border-brand-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{ height }}
      >
        <EditorErrorBoundary fallback={renderFallbackTextarea()}>
          <Editor
            wrapperProps={{ id: editorId }}
            height="100%"
            language={activeLanguage}
            theme={monacoTheme}
            value={value}
            onChange={(val) => onChange?.(val ?? '')}
            options={editorOptions}
            loading={<EditorLoadingSkeleton />}
            aria-label={label}
          />
        </EditorErrorBoundary>
      </div>

      {/* Validation Error Message */}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Helper text */}
      {!error && helperText && (
        <p id={helperId} className="text-xs text-slate-500 dark:text-slate-400">
          {helperText}
        </p>
      )}
    </div>
  );
};

export default GistEditor;
