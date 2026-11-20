import React, { useState, useRef, useEffect } from 'react';
import { Share2, Search, Loader2, CheckCircle2, AlertCircle, UserCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useShareGistMutation } from '@/hooks';
import { authService } from '@/services/auth';
import { getApiErrorMessage } from '@/utils/errors';
import type { Gist } from '@/types/gist';
import type { User } from '@/types/auth';

export interface ShareGistModalProps {
  gist: Gist | null;
  isOpen: boolean;
  onClose: () => void;
}

type LookupState =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'found'; user: User }
  | { status: 'not_found' }
  | { status: 'error'; message: string };

type ShareState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success'; username: string }
  | { status: 'error'; message: string };

export const ShareGistModal: React.FC<ShareGistModalProps> = ({
  gist,
  isOpen,
  onClose,
}) => {
  const [username, setUsername] = useState('');
  const [lookupState, setLookupState] = useState<LookupState>({ status: 'idle' });
  const [shareState, setShareState] = useState<ShareState>({ status: 'idle' });

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shareMutation = useShareGistMutation();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setUsername('');
      setLookupState({ status: 'idle' });
      setShareState({ status: 'idle' });
      if (debounceRef.current) clearTimeout(debounceRef.current);
    } else {
      // Focus the input when modal opens
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced user lookup as the owner types
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = username.trim();

    if (!trimmed) {
      setLookupState({ status: 'idle' });
      return;
    }

    setLookupState({ status: 'searching' });

    debounceRef.current = setTimeout(async () => {
      try {
        const user = await authService.lookupUser(trimmed);
        setLookupState({ status: 'found', user });
      } catch (err: unknown) {
        const isAxios = (e: unknown): e is { response?: { status?: number } } =>
          typeof e === 'object' && e !== null && 'response' in e;
        if (isAxios(err) && err.response?.status === 404) {
          setLookupState({ status: 'not_found' });
        } else {
          setLookupState({
            status: 'error',
            message: getApiErrorMessage(err, 'Failed to look up user.'),
          });
        }
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username]);

  const resolvedUser = lookupState.status === 'found' ? lookupState.user : null;
  const canShare =
    lookupState.status === 'found' &&
    shareState.status !== 'pending' &&
    shareState.status !== 'success';

  const handleShare = () => {
    if (!gist || !resolvedUser) return;

    setShareState({ status: 'pending' });

    shareMutation.mutate(
      { id: gist.id, payload: { recipient_id: resolvedUser.id } },
      {
        onSuccess: () => {
          setShareState({ status: 'success', username: resolvedUser.username });
        },
        onError: (err) => {
          setShareState({
            status: 'error',
            message: getApiErrorMessage(err, 'Failed to share gist.'),
          });
        },
      }
    );
  };

  const handleClose = React.useCallback(() => {
    if (shareState.status !== 'pending') {
      onClose();
    }
  }, [shareState.status, onClose]);

  if (!gist) return null;

  const isPending = shareState.status === 'pending';
  const isSuccess = shareState.status === 'success';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Share Gist"
      description={`Share "${gist.title}" with another user by their username.`}
      maxWidth="sm"
      footer={
        isSuccess ? (
          <Button variant="outline" size="sm" onClick={handleClose}>
            Close
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Share2 className="w-3.5 h-3.5" />}
              onClick={handleShare}
              disabled={!canShare}
              isLoading={isPending}
            >
              {isPending ? 'Sharing…' : 'Share'}
            </Button>
          </>
        )
      }
    >
      <div className="space-y-4">
        {/* Success Banner */}
        {isSuccess && shareState.status === 'success' && (
          <div
            role="status"
            className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 dark:text-emerald-200 space-y-0.5">
              <p className="font-semibold">Gist shared successfully!</p>
              <p className="text-emerald-700 dark:text-emerald-300">
                <span className="font-mono font-medium">{shareState.username}</span> can
                now view this gist in read-only mode.
              </p>
            </div>
          </div>
        )}

        {/* Username Input — hidden after success */}
        {!isSuccess && (
          <>
            <Input
              ref={inputRef}
              id="share-username-input"
              label="Recipient username"
              placeholder="Enter exact username…"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                // Clear any previous share error when the user edits the input
                if (shareState.status === 'error') {
                  setShareState({ status: 'idle' });
                }
              }}
              disabled={isPending}
              autoComplete="off"
              spellCheck={false}
              leftIcon={<Search className="w-4 h-4" />}
              aria-label="Recipient username"
            />

            {/* Lookup feedback */}
            <div className="min-h-[40px]">
              {lookupState.status === 'searching' && (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Looking up user…</span>
                </div>
              )}

              {lookupState.status === 'found' && (
                <div
                  className="flex items-center gap-2.5 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50"
                  role="status"
                  aria-live="polite"
                >
                  <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div className="text-xs">
                    <span className="font-medium text-blue-900 dark:text-blue-200 font-mono">
                      {lookupState.user.username}
                    </span>
                    <span className="text-blue-700 dark:text-blue-300 ml-1.5">
                      (ID: {lookupState.user.id}) — ready to share
                    </span>
                  </div>
                </div>
              )}

              {lookupState.status === 'not_found' && (
                <div
                  className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400"
                  role="alert"
                  aria-live="polite"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>No user found with that username.</span>
                </div>
              )}

              {lookupState.status === 'error' && (
                <div
                  className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400"
                  role="alert"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{lookupState.message}</span>
                </div>
              )}
            </div>

            {/* Share error (from mutation) */}
            {shareState.status === 'error' && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400"
              >
                {shareState.message}
              </div>
            )}

            {/* Informational note */}
            <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
              The recipient will gain read-only access to this gist. They will not be
              able to edit or delete it. Usernames are case-sensitive.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
};

export default ShareGistModal;
