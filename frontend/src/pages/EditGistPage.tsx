import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, FileCode, AlertCircle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GistEditor } from '@/components/gists';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/LoadingState';
import { useGistDetailQuery, useUpdateGistMutation } from '@/hooks';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { getApiErrorMessage, extractValidationErrors } from '@/utils/errors';

export const EditGistPage: React.FC = () => {
  const { gistId } = useParams<{ gistId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const handleReturnToDetail = (targetId?: number) => {
    const id = targetId ?? (gist ? gist.id : numericId);
    if (location.state?.fromDetail) {
      navigate(-1);
    } else {
      navigate(`/gists/${id}`, { replace: true });
    }
  };

  const numericId = gistId ? parseInt(gistId, 10) : NaN;
  const isInvalidId = isNaN(numericId) || numericId <= 0;

  const { data: gist, isLoading, isError, error } = useGistDetailQuery(
    isInvalidId ? null : numericId
  );
  const updateMutation = useUpdateGistMutation();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Prepopulate form when gist is loaded
  useEffect(() => {
    if (gist) {
      setTitle(gist.title);
      setContent(gist.content);
    }
  }, [gist]);

  // Case 1: Invalid Gist ID
  if (isInvalidId) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 py-8">
        <div className="p-6 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
          <h2 className="text-base font-semibold text-amber-900 dark:text-amber-200">
            Invalid Gist ID
          </h2>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            The requested Gist ID is invalid.
          </p>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/gists')}
          >
            Back to My Gists
          </Button>
        </div>
      </div>
    );
  }

  // Case 2: Loading
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <Skeleton className="w-16 h-8 rounded-lg" />
          <Skeleton className="w-48 h-8 rounded-lg" />
        </div>
        <Skeleton className="w-full h-96 rounded-xl" />
      </div>
    );
  }

  // Case 3: Error loading
  if (isError || !gist) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 py-8">
        <div className="p-6 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <h2 className="text-base font-semibold text-red-900 dark:text-red-200">
            Failed to Load Gist for Editing
          </h2>
          <p className="text-xs text-red-700 dark:text-red-300">
            {getApiErrorMessage(error, 'Could not retrieve this gist from the server.')}
          </p>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/gists')}
          >
            Back to My Gists
          </Button>
        </div>
      </div>
    );
  }

  // Case 4: Non-owner blocked from editing
  if (user && gist.owner_id !== user.id) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 py-8">
        <div className="p-6 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-center space-y-3">
          <ShieldAlert className="w-8 h-8 text-red-500 mx-auto" />
          <h2 className="text-base font-semibold text-red-900 dark:text-red-200">
            Editing Not Allowed
          </h2>
          <p className="text-xs text-red-700 dark:text-red-300">
            Only the creator of this gist is permitted to modify it. You have read-only access.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => navigate(`/gists/${gist.id}`)}
            >
              View Read-Only
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/gists')}
            >
              Back to My Gists
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!title.trim()) {
      errors.title = 'Title cannot be empty';
    }
    if (!content.trim()) {
      errors.content = 'Content cannot be empty';
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

    updateMutation.mutate(
      {
        id: gist.id,
        payload: {
          title: title.trim(),
          content: content.trim(),
        },
      },
      {
        onSuccess: (updated) => {
          showSuccess(`Gist "${updated.title}" updated successfully!`);
          handleReturnToDetail(updated.id);
        },
        onError: (err) => {
          const fieldErrs = extractValidationErrors(err);
          if (Object.keys(fieldErrs).length > 0) {
            setFormErrors(fieldErrs);
          }
          const msg = getApiErrorMessage(err, 'Failed to update gist.');
          setGlobalError(msg);
          showError(msg);
        },
      }
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => handleReturnToDetail()}
            aria-label="Back to gist"
          >
            Back
          </Button>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileCode className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            Edit Gist
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-normal border border-slate-200 dark:border-slate-700">
              #{gist.id}
            </span>
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
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (formErrors.title) {
                setFormErrors((prev) => ({ ...prev, title: '' }));
              }
            }}
            error={formErrors.title}
            helperText="Filename or title for this gist"
            disabled={updateMutation.isPending}
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
            disabled={updateMutation.isPending}
            titleHint={title}
            height="360px"
          />

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => handleReturnToDetail()}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              leftIcon={<Save className="w-4 h-4" />}
              isLoading={updateMutation.isPending}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default EditGistPage;
