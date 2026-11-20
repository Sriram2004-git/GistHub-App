import React, { useEffect, useRef } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/layouts/AppLayout';
import { HomePage } from '@/pages/HomePage';
import { MyGistsPage } from '@/pages/MyGistsPage';
import { CreateGistPage } from '@/pages/CreateGistPage';
import { GistDetailPage } from '@/pages/GistDetailPage';
import { EditGistPage } from '@/pages/EditGistPage';
import { SharedGistsPage } from '@/pages/SharedGistsPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PublicRoute } from '@/components/auth/PublicRoute';
import { useAuth } from '@/contexts/AuthContext';
import { gistKeys } from '@/hooks/queries/gistKeys';

/**
 * GistCacheManager watches the authenticated user identity and removes all
 * user-scoped gist queries from the TanStack Query cache whenever the
 * authenticated user changes (login → different account, or logout → null).
 *
 * This component must live inside both QueryClientProvider and AuthProvider
 * to have access to both useQueryClient() and useAuth(). AppRoutes is the
 * natural mounting point because it already satisfies both requirements.
 *
 * On removal it uses `removeQueries` (not `invalidateQueries`) so that stale
 * data is fully evicted and cannot be displayed to the next user even for a
 * single render cycle.
 */
const GistCacheManager: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const prevUserIdRef = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    const prevUserId = prevUserIdRef.current;

    // Skip the very first render (undefined → initial value means we have
    // not yet observed any user; do nothing until a real transition occurs).
    if (prevUserId === undefined) {
      prevUserIdRef.current = user?.id ?? null;
      return;
    }

    const nextUserId = user?.id ?? null;

    // A real user transition occurred (logout or account switch).
    if (prevUserId !== nextUserId) {
      // Remove all entries under the ['gists'] root key.  This covers:
      //   ['gists', 'mine', <userId>]
      //   ['gists', 'shared', <userId>]
      //   ['gists', 'detail', <id>]
      // Using predicate-based removal to target only user-scoped list queries
      // while leaving globally-keyed detail entries in place for the new user
      // (they will be re-validated via the backend authorization layer anyway).
      if (prevUserId !== null) {
        queryClient.removeQueries({ queryKey: gistKeys.mine(prevUserId) });
        queryClient.removeQueries({ queryKey: gistKeys.shared(prevUserId) });
      }
      // Also clear any detail cache so a new session starts fresh.
      queryClient.removeQueries({ queryKey: gistKeys.details() });

      prevUserIdRef.current = nextUserId;
    }
  }, [user, queryClient]);

  return null;
};

export const AppRoutes: React.FC = () => {
  return (
    <>
      {/* Clears user-scoped gist cache on logout and account switching. */}
      <GistCacheManager />
      <Routes>
      {/* Public Authentication Routes */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected Application Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/gists" element={<MyGistsPage />} />
          <Route path="/gists/new" element={<CreateGistPage />} />
          <Route path="/gists/:gistId" element={<GistDetailPage />} />
          <Route path="/gists/:gistId/edit" element={<EditGistPage />} />
          <Route path="/shared" element={<SharedGistsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
    </>
  );
};

export default AppRoutes;
