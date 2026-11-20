import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCode,
  Plus,
  Share2,
  ShieldCheck,
  Zap,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/LoadingState';
import { useMyGistsQuery, useSharedGistsQuery } from '@/hooks';
import { useAuth } from '@/contexts/AuthContext';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    data: myGists,
    isLoading: isLoadingMine,
  } = useMyGistsQuery();

  const {
    data: sharedGists,
    isLoading: isLoadingShared,
  } = useSharedGistsQuery();

  const ownedCount = myGists ? myGists.length : 0;
  const sharedCount = sharedGists ? sharedGists.length : 0;

  // First few gists for the overview cards
  const displayOwnedGists = myGists ? myGists.slice(0, 3) : [];
  const displaySharedGists = sharedGists ? sharedGists.slice(0, 3) : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0e131f] p-6 sm:p-8 shadow-card dark:shadow-card-dark">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <Badge variant="info" size="sm">
                Developer Workspace
              </Badge>
              {user && (
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Welcome back, @{user.username}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Welcome to GistHub
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Create, organize, and securely share code snippets, configuration files, and
              notes. Fast, typed, and backed by your FastAPI server.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => navigate('/gists/new')}
            >
              Create Gist
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/gists')}
            >
              View My Gists
            </Button>
          </div>
        </div>

        {/* Real Metrics Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80">
          <div
            onClick={() => navigate('/gists')}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Owned Gists</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {isLoadingMine ? '...' : ownedCount}
              </p>
            </div>
          </div>

          <div
            onClick={() => navigate('/shared')}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Shared with Me</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">
                {isLoadingShared ? '...' : sharedCount}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Authenticated Session</p>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Active
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: My Gists & Shared with Me Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Owned Gists Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle>My Gists</CardTitle>
                <Badge variant="default" size="sm">
                  {isLoadingMine ? 'Loading...' : `${ownedCount} Total`}
                </Badge>
              </div>
              {ownedCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  onClick={() => navigate('/gists')}
                  className="text-xs"
                >
                  View All
                </Button>
              )}
            </div>
            <CardDescription>
              Your personal code snippets and markdown documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMine ? (
              <CardSkeleton />
            ) : ownedCount === 0 ? (
              <EmptyState
                icon={<FileCode className="w-6 h-6" />}
                title="No gists created yet"
                description="Write and publish your first code snippet or note."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => navigate('/gists/new')}
                  >
                    Create Gist
                  </Button>
                }
              />
            ) : (
              <div className="space-y-2.5">
                {displayOwnedGists.map((gist) => (
                  <div
                    key={gist.id}
                    onClick={() => navigate(`/gists/${gist.id}`)}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0a0e17]/50 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <FileCode className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400">
                          {gist.title}
                        </p>
                        <p className="text-[11px] font-mono text-slate-500 truncate">
                          {gist.content.split('\n')[0] || '(empty)'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                        #{gist.id}
                      </span>
                      <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shared with Me Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle>Shared with Me</CardTitle>
                <Badge variant="purple" size="sm">
                  {isLoadingShared ? 'Loading...' : `${sharedCount} Total`}
                </Badge>
              </div>
              {sharedCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  onClick={() => navigate('/shared')}
                  className="text-xs"
                >
                  View All
                </Button>
              )}
            </div>
            <CardDescription>
              Gists shared directly with your account by other users
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingShared ? (
              <CardSkeleton />
            ) : sharedCount === 0 ? (
              <EmptyState
                icon={<Share2 className="w-6 h-6" />}
                title="No shared gists yet"
                description="Gists shared with your user ID will appear here in read-only mode."
              />
            ) : (
              <div className="space-y-2.5">
                {displaySharedGists.map((gist) => (
                  <div
                    key={gist.id}
                    onClick={() => navigate(`/gists/${gist.id}`)}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0a0e17]/50 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <Share2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400">
                          {gist.title}
                        </p>
                        <p className="text-[11px] font-mono text-slate-500 truncate">
                          {gist.content.split('\n')[0] || '(empty)'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                        #{gist.id}
                      </span>
                      <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feature & Technical Capabilities Footer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0e131f] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
              Instant CRUD &amp; Cache Invalidation
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              TanStack Query synchronization keeps your gist library updated in real-time.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0e131f] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
              Strict Backend Authorization
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Ownership guards prevent unauthorized modifications and enforce permissions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
