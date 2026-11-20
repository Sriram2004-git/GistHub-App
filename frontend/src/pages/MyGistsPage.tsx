import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCode, Plus, Search, X, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/LoadingState';
import { GistCard, DeleteGistModal } from '@/components/gists';
import { useMyGistsQuery } from '@/hooks';
import { getApiErrorMessage } from '@/utils/errors';
import type { Gist } from '@/types/gist';

export const MyGistsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: gists, isLoading, isError, error, refetch, isFetching } = useMyGistsQuery();

  const [searchQuery, setSearchQuery] = useState('');
  const [gistToDelete, setGistToDelete] = useState<Gist | null>(null);

  // Client-side search by title or content
  const filteredGists = useMemo(() => {
    if (!gists) return [];
    if (!searchQuery.trim()) return gists;

    const query = searchQuery.toLowerCase().trim();
    return gists.filter(
      (gist) =>
        gist.title.toLowerCase().includes(query) ||
        gist.content.toLowerCase().includes(query)
    );
  }, [gists, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              My Gists
            </h1>
            {gists && (
              <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium border border-slate-200 dark:border-slate-700">
                {gists.length}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage, edit, or delete your code snippets and documents
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />}
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh gists"
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/gists/new')}
          >
            Create Gist
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      {((gists && gists.length > 0) || searchQuery) && (
        <div className="relative max-w-md">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search gists by title or content..."
            leftIcon={<Search className="w-4 h-4" />}
            aria-label="Search my gists"
            rightIcon={
              searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 pointer-events-auto transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : undefined
            }
          />
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {/* Error State */}
      {!isLoading && isError && (
        <div
          role="alert"
          className="p-6 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 text-center space-y-3"
        >
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <h3 className="text-sm font-semibold text-red-900 dark:text-red-200">
            Failed to load gists
          </h3>
          <p className="text-xs text-red-700 dark:text-red-300 max-w-sm mx-auto">
            {getApiErrorMessage(error, 'Could not retrieve your gists from the server.')}
          </p>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => refetch()}
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Empty State: No Gists Created Yet */}
      {!isLoading && !isError && gists && gists.length === 0 && (
        <EmptyState
          icon={<FileCode className="w-8 h-8 text-brand-600 dark:text-brand-400" />}
          title="You haven't created any gists yet"
          description="Create your first gist to store code snippets, configuration files, or notes."
          action={
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => navigate('/gists/new')}
            >
              Create your first gist
            </Button>
          }
        />
      )}

      {/* No Results from Search State */}
      {!isLoading && !isError && gists && gists.length > 0 && filteredGists.length === 0 && (
        <EmptyState
          icon={<Search className="w-8 h-8 text-slate-400" />}
          title={`No gists matching "${searchQuery}"`}
          description="Try checking for typos or searching with different keywords."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery('')}
            >
              Clear search
            </Button>
          }
        />
      )}

      {/* Gists Grid List */}
      {!isLoading && !isError && filteredGists.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGists.map((gist) => (
            <GistCard
              key={gist.id}
              gist={gist}
              isOwner
              onDeleteClick={(g) => setGistToDelete(g)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteGistModal
        gist={gistToDelete}
        isOpen={!!gistToDelete}
        onClose={() => setGistToDelete(null)}
      />
    </div>
  );
};

export default MyGistsPage;
