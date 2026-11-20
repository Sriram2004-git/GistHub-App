import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, FileCode, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GistEditor } from '@/components/gists';
import { Card } from '@/components/ui/Card';
import { useCreateGistMutation } from '@/hooks';
import { useNotification } from '@/contexts/NotificationContext';
import { getApiErrorMessage, extractValidationErrors } from '@/utils/errors';

export const CreateGistPage: React.FC = () => {
  const navigate = useNavigate();
  const createMutation = useCreateGistMutation();
  const { showSuccess, showError } = useNotification();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!title.trim()) {
      errors.title = 'Title is required';
    }
    if (!content.trim()) {
      errors.content = 'Content is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);

    if (!validate()) {
      return;
    }

    createMutation.mutate(
      {
        title: title.trim(),
        content: content.trim(),
      },
      {
        onSuccess: (data) => {
          showSuccess(`Gist "${data.title}" created successfully!`);
          navigate(`/gists/${data.id}`);
        },
        onError: (err) => {
          const fieldErrs = extractValidationErrors(err);
          if (Object.keys(fieldErrs).length > 0) {
            setFormErrors(fieldErrs);
          }
          const msg = getApiErrorMessage(err, 'Failed to create gist. Please check your input.');
          setGlobalError(msg);
          showError(msg);
        },
      }
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header with Back Navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/gists')}
            aria-label="Back to my gists"
          >
            Back
          </Button>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileCode className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            Create New Gist
          </h1>
        </div>
      </div>

      {/* Global Error Banner */}
      {globalError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs text-red-800 dark:text-red-200">{globalError}</div>
        </div>
      )}

      {/* Form Card */}
      <Card variant="default">
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <Input
            label="Gist Title"
            name="title"
            placeholder="e.g. index.ts, docker-compose.yml, notes.md"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (formErrors.title) {
                setFormErrors((prev) => ({ ...prev, title: '' }));
              }
            }}
            error={formErrors.title}
            helperText="Provide a filename or descriptive title"
            disabled={createMutation.isPending}
            required
          />

          <GistEditor
            label="Gist Content"
            value={content}
            onChange={(val) => {
              setContent(val);
              if (formErrors.content) {
                setFormErrors((prev) => ({ ...prev, content: '' }));
              }
            }}
            error={formErrors.content}
            helperText="Preserves whitespace and formatting"
            disabled={createMutation.isPending}
            titleHint={title}
            height="360px"
          />

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => navigate('/gists')}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              isLoading={createMutation.isPending}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Publishing...' : 'Create Gist'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CreateGistPage;
