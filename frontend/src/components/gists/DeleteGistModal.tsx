import React, { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useDeleteGistMutation } from '@/hooks';
import { useNotification } from '@/contexts/NotificationContext';
import { getApiErrorMessage } from '@/utils/errors';
import type { Gist } from '@/types/gist';

export interface DeleteGistModalProps {
  gist: Gist | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

export const DeleteGistModal: React.FC<DeleteGistModalProps> = ({
  gist,
  isOpen,
  onClose,
  onDeleted,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const deleteMutation = useDeleteGistMutation();
  const { showSuccess, showError } = useNotification();

  if (!gist) return null;

  const handleDelete = async () => {
    setErrorMessage(null);
    deleteMutation.mutate(gist.id, {
      onSuccess: () => {
        showSuccess(`Gist "${gist.title}" was permanently deleted.`);
        onClose();
        onDeleted?.();
      },
      onError: (err) => {
        const msg = getApiErrorMessage(err, 'Failed to delete gist.');
        setErrorMessage(msg);
        showError(msg);
      },
    });
  };

  const handleClose = () => {
    if (!deleteMutation.isPending) {
      setErrorMessage(null);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Delete Gist"
      description="This action cannot be undone."
      maxWidth="sm"
      footer={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            leftIcon={<Trash2 className="w-4 h-4" />}
            onClick={handleDelete}
            isLoading={deleteMutation.isPending}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs text-red-900 dark:text-red-200 space-y-1">
            <p className="font-semibold">Are you sure you want to delete this gist?</p>
            <p className="text-red-700 dark:text-red-300">
              Gist <strong className="font-mono">"{gist.title}"</strong> (ID: #{gist.id}) will be
              permanently removed. All associated sharing permissions will also be deleted.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400"
          >
            {errorMessage}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DeleteGistModal;
