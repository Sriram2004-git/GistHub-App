import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Copy,
  Check,
  Edit3,
  Trash2,
  FileCode,
  Shield,
  AlertCircle,
  ShieldAlert,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/LoadingState';
import { DeleteGistModal, GistEditor, ShareGistModal } from '@/components/gists';
import { useGistDetailQuery } from '@/hooks';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { getApiErrorMessage, getApiStatusCode } from '@/utils/errors';

export const GistDetailPage: React.FC = () => {
  const { gistId } = useParams<{ gistId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [copied, setCopied] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Parse ID
  const numericId = gistId ? parseInt(gistId, 10) : NaN;
  const isInvalidId = isNaN(numericId) || numericId <= 0;

  const { data: gist, isLoading, isError, error, refetch } = useGistDetailQuery(
    isInvalidId ? null : numericId
  );

  const statusCode = getApiStatusCode(error);
  const isOwner = !!(user && gist && gist.owner_id === user.id);

  const handleCopy = async () => {
    if (!gist?.content) return;
    try {
      await navigator.clipboard.writeText(gist.content);
      setCopied(true);
      showSuccess('Gist content copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showError('Failed to copy to clipboard.');
    }
  };

  // Case 1: Invalid ID in URL
  if (isInvalidId) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 py-8">
        <div className="p-6 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
          <h2 className="text-base font-semibold text-amber-900 dark:text-amber-200">
            Invalid Gist ID
          </h2>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            The requested Gist identifier is invalid. Gist IDs must be positive integers.
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

  // Case 2: Loading State
  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Skeleton className="w-16 h-8 rounded-lg" />
            <Skeleton className="w-48 h-8 rounded-lg" />
          </div>
          <Skeleton className="w-24 h-8 rounded-lg" />
        </div>
        <Skeleton className="w-full h-80 rounded-xl" />
      </div>
    );
  }

  // Case 3: HTTP 403 Forbidden
  if (isError && statusCode === 403) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 py-8">
        <div className="p-6 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-center space-y-3">
          <ShieldAlert className="w-8 h-8 text-red-500 mx-auto" />
          <h2 className="text-base font-semibold text-red-900 dark:text-red-200">
            Access Denied
          </h2>
          <p className="text-xs text-red-700 dark:text-red-300">
            You do not have permission to view this gist. You must be the owner or an authorized recipient.
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

  // Case 4: HTTP 404 Not Found
  if (isError && statusCode === 404) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 py-8">
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-3">
          <FileCode className="w-8 h-8 text-slate-400 mx-auto" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Gist Not Found
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gist #{numericId} could not be found. It may have been permanently deleted by its creator.
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

  // Case 5: Generic Error
  if (isError || !gist) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 py-8">
        <div className="p-6 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <h2 className="text-base font-semibold text-red-900 dark:text-red-200">
            Failed to Load Gist
          </h2>
          <p className="text-xs text-red-700 dark:text-red-300">
            {getApiErrorMessage(error, 'An unexpected error occurred while retrieving this gist.')}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => navigate('/gists')}
            >
              Back
            </Button>
            <Button variant="primary" size="sm" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Case 6: Loaded Successfully
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Detail Header & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate(-1)}
            aria-label="Back"
          >
            Back
          </Button>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
              <FileCode className="w-4 h-4" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
              {gist.title}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-medium">
            #{gist.id}
          </span>

          {!isOwner && (
            <Badge variant="purple" size="sm">
              <Shield className="w-3.5 h-3.5 mr-1 inline" />
              Shared with you (Read Only)
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            onClick={handleCopy}
            className="text-xs"
          >
            {copied ? 'Copied!' : 'Copy Content'}
          </Button>

          {isOwner && (
            <>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                onClick={() => navigate(`/gists/${gist.id}/edit`, { state: { fromDetail: true } })}
                className="text-xs"
              >
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Share2 className="w-3.5 h-3.5" />}
                onClick={() => setShareModalOpen(true)}
                className="text-xs"
              >
                Share
              </Button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => setDeleteModalOpen(true)}
                className="text-xs"
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Code / Content Display Container with Monaco Editor (Read-Only) */}
      <Card variant="default" className="p-4 sm:p-6 overflow-hidden">
        <GistEditor
          value={gist.content}
          readOnly={true}
          titleHint={gist.title}
          height="450px"
          helperText={`${gist.content.split('\n').length} lines • ${gist.content.length} characters`}
        />
      </Card>

      {/* Delete Confirmation Modal */}
      {isOwner && (
        <DeleteGistModal
          gist={gist}
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onDeleted={() => navigate('/gists', { replace: true })}
        />
      )}

      {/* Share Gist Modal */}
      {isOwner && (
        <ShareGistModal
          gist={gist}
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
        />
      )}
    </div>
  );
};

export default GistDetailPage;
