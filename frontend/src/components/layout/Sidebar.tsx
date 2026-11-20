import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FileCode,
  FolderGit2,
  Home,
  LogOut,
  MoreVertical,
  Plus,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { ThemeSelector } from '@/components/common/ThemeSelector';
import { Dropdown, DropdownDivider, DropdownItem } from '@/components/ui/Dropdown';
import { useAuth } from '@/contexts/AuthContext';

export interface SidebarProps {
  onCreateGistClick?: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onCreateGistClick,
  className = '',
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navItems = [
    { label: 'Home', path: '/', icon: <Home className="w-4 h-4" /> },
    { label: 'My Gists', path: '/gists', icon: <FileCode className="w-4 h-4" /> },
    { label: 'Shared with me', path: '/shared', icon: <Share2 className="w-4 h-4" /> },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      className={`w-64 shrink-0 border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0e131f] flex flex-col justify-between h-screen sticky top-0 transition-colors select-none ${className}`}
    >
      {/* Top Section */}
      <div className="p-4 flex flex-col gap-5">
        {/* Logo */}
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 px-2 py-1 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold shadow-sm group-hover:bg-brand-700 transition-colors">
            <FolderGit2 className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              GistHub
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                v0.1
              </span>
            </span>
          </div>
        </div>

        {/* Primary Action */}
        <div className="px-1">
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={onCreateGistClick}
            className="w-full justify-start shadow-sm font-semibold text-xs tracking-wide uppercase"
          >
            Create Gist
          </Button>
        </div>

        {/* Navigation Items */}
        <nav aria-label="Main Navigation" className="flex flex-col gap-1 mt-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-800/90 text-brand-600 dark:text-brand-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                }`
              }
            >
              <span className="shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 flex flex-col gap-2 bg-slate-50/50 dark:bg-[#0a0e17]/50">
        {/* Theme Selector */}
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Theme</span>
          <ThemeSelector variant="segmented" />
        </div>

        {/* User Account Menu */}
        <div className="relative">
          <Dropdown
            align="left"
            className="w-56 bottom-full mb-2"
            trigger={({ toggle, isOpen }) => (
              <button
                type="button"
                onClick={toggle}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-label={`User account menu for ${user?.username || 'user'}`}
                className="w-full flex items-center justify-between p-2 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-subtle hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar name={user?.username || 'User'} size="sm" />
                  <div className="min-w-0 flex flex-col">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-200 truncate">
                      {user?.username || 'User'}
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 truncate flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      Active session
                    </span>
                  </div>
                </div>
                <MoreVertical className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              </button>
            )}
          >
            <div className="px-3 py-2 text-xs border-b border-slate-100 dark:border-slate-800">
              <p className="text-slate-400 text-[10px]">Signed in as</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                @{user?.username}
              </p>
            </div>
            <DropdownDivider />
            <DropdownItem
              label="Sign out"
              icon={<LogOut className="w-4 h-4" />}
              danger
              onClick={handleLogout}
            />
          </Dropdown>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
