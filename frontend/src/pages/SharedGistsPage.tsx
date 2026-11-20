import React, { useState, useMemo } from 'react';
import { Share2, Search, X, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/LoadingState';
import { GistCard } from '@/components/gists';
import { useSharedGistsQuery } from '@/hooks';
import { getApiErrorMessage } from '@/utils/errors';

export const SharedGistsPage: React.FC = () => {
  const { data: sharedGists, isLoading, isError, error, refetch, isFetching } = useSharedGistsQuery();
  const [searchQuery, setSearchQuery] = useState('');

  // Client-side search by title or content
  const filteredGists = useMemo(() => {
    if (!sharedGists) return [];
    if (!searchQuery.trim()) return sharedGists;

    const query = searchQuery.toLowerCase().trim();
    return sharedGists.filter(
      (gist) =>
        gist.title.toLowerCase().includes(query) ||
        gist.content.toLowerCase().includes(query)
    );
  }, [sharedGists, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Shared with me
            </h1>
            {sharedGists && (
              <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium border border-slate-200 dark:border-slate-700">
                {sharedGists.length}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gists that other users have granted you read access to
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />}
          onClick={() => refetch()}
          disabled={isFetching}
          title="Refresh shared gists"
        >
          Refresh
        </Button>
      </div>

      {/* Search Bar */}
      {((sharedGists && sharedGists.length > 0) || searchQuery) && (
        <div className="relative max-w-md">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shared gists by title or content..."
            leftIcon={<Search className="w-4 h-4" />}
            aria-label="Search shared gists"
            rightIcon={
              searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search query"
                  className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 pointer-events-auto transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : undefined
            }
          />
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            Failed to load shared gists
          </h3>
          <p className="text-xs text-red-700 dark:text-red-300 max-w-sm mx-auto">
            {getApiErrorMessage(error, 'Could not retrieve shared gists from the server.')}
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

      {/* Empty State: No Shared Gists */}
      {!isLoading && !isError && sharedGists && sharedGists.length === 0 && (
        <EmptyState
          icon={<Share2 className="w-8 h-8 text-purple-600 dark:text-purple-400" />}
          title="No shared gists yet"
          description="When another user shares a gist with your account, it will appear here in read-only mode."
        />
      )}

      {/* No Results from Search */}
      {!isLoading && !isError && sharedGists && sharedGists.length > 0 && filteredGists.length === 0 && (
        <EmptyState
          icon={<Search className="w-8 h-8 text-slate-400" />}
          title={`No shared gists matching "${searchQuery}"`}
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

      {/* Gists Grid List (Read-Only) */}
      {!isLoading && !isError && filteredGists.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGists.map((gist) => (
            <GistCard
              key={gist.id}
              gist={gist}
              isOwner={false}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SharedGistsPage;
