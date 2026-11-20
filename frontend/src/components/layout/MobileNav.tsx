import React, { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FileCode,
  FolderGit2,
  Home,
  LogOut,
  Plus,
  Share2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { ThemeSelector } from '@/components/common/ThemeSelector';
import { useAuth } from '@/contexts/AuthContext';

export interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGistClick?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  isOpen,
  onClose,
  onCreateGistClick,
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const drawerRef = React.useRef<HTMLDivElement>(null);
  const triggerElementRef = React.useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      triggerElementRef.current = document.activeElement as HTMLElement | null;
      document.body.style.overflow = 'hidden';

      const timer = setTimeout(() => {
        if (drawerRef.current) {
          const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length > 0) {
            focusable[0].focus();
          }
        }
      }, 0);

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
          return;
        }

        if (event.key === 'Tab' && drawerRef.current) {
          const focusable = Array.from(
            drawerRef.current.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          );

          if (focusable.length === 0) {
            event.preventDefault();
            return;
          }

          const firstElement = focusable[0];
          const lastElement = focusable[focusable.length - 1];

          if (event.shiftKey) {
            if (document.activeElement === firstElement || !drawerRef.current.contains(document.activeElement)) {
              event.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement || !drawerRef.current.contains(document.activeElement)) {
              event.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleKeyDown);
        if (triggerElementRef.current && typeof triggerElementRef.current.focus === 'function') {
          triggerElementRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const navItems = [
    { label: 'Home', path: '/', icon: <Home className="w-4 h-4" /> },
    { label: 'My Gists', path: '/gists', icon: <FileCode className="w-4 h-4" /> },
    { label: 'Shared with me', path: '/shared', icon: <Share2 className="w-4 h-4" /> },
  ];

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/login', { replace: true });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Navigation"
      className="fixed inset-0 z-50 lg:hidden flex"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Surface */}
      <div
        ref={drawerRef}
        className="relative w-72 max-w-[80vw] h-full bg-white dark:bg-[#0e131f] border-r border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between shadow-2xl z-10 animate-in slide-in-from-left duration-200"
      >
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div
              onClick={() => {
                navigate('/');
                onClose();
              }}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold">
                <FolderGit2 className="w-4 h-4" />
              </div>
              <span className="font-bold text-base text-slate-900 dark:text-white">
                GistHub
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation"
              className="p-1 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action */}
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              onClose();
              onCreateGistClick?.();
            }}
            className="w-full justify-start font-semibold text-xs tracking-wide uppercase"
          >
            Create Gist
          </Button>

          {/* Nav Links */}
          <nav aria-label="Mobile Main Navigation" className="flex flex-col gap-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800/90 text-brand-600 dark:text-brand-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`
                }
              >
                <span className="shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Theme</span>
            <ThemeSelector variant="segmented" />
          </div>

          {/* Authenticated User Card */}
          <div className="flex items-center justify-between p-2 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar name={user?.username || 'User'} size="sm" />
              <div className="min-w-0 flex flex-col">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-200 truncate">
                  {user?.username || 'User'}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 truncate flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  Online
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileNav;
