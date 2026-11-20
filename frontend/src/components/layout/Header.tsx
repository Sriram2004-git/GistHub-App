import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface HeaderProps {
  onMobileMenuOpen: () => void;
  onCreateGistClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onMobileMenuOpen,
  onCreateGistClick,
}) => {
  const location = useLocation();

  const getPageTitle = (pathname: string) => {
    if (pathname === '/') return 'Overview';
    if (pathname === '/gists') return 'My Gists';
    if (pathname === '/gists/new') return 'New Gist';
    if (pathname === '/shared') return 'Shared with Me';
    if (/^\/gists\/\d+\/edit$/.test(pathname)) return 'Edit Gist';
    if (/^\/gists\/\d+$/.test(pathname)) return 'Gist Details';
    return 'GistHub';
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0b0f19]/80 backdrop-blur px-4 sm:px-6 transition-colors">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onMobileMenuOpen}
          aria-label="Open mobile navigation"
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb / Title */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {getPageTitle(location.pathname)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-400 text-xs w-48 lg:w-64">
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Search gists (disabled)...</span>
          <kbd className="ml-auto font-mono text-[10px] px-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-400">
            /
          </kbd>
        </div>

        <Button
          variant="outline"
          size="sm"
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          onClick={onCreateGistClick}
          className="sm:hidden"
        >
          New
        </Button>
      </div>
    </header>
  );
};

