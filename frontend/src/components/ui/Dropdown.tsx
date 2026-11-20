import React, { useEffect, useRef, useState } from 'react';

export interface DropdownItemProps {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  active?: boolean;
}

export interface DropdownProps {
  trigger: (props: { isOpen: boolean; toggle: () => void }) => React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  align = 'left',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggle = () => setIsOpen((prev) => !prev);
  const close = () => setIsOpen(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        close();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        close();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {trigger({ isOpen, toggle })}

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className={`absolute z-50 mt-1.5 w-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-elevation p-1 focus:outline-none transition-all ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${className}`}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export const DropdownItem: React.FC<DropdownItemProps> = ({
  label,
  icon,
  onClick,
  disabled = false,
  danger = false,
  active = false,
}) => {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg text-left transition-colors duration-100 ${
        disabled
          ? 'opacity-40 cursor-not-allowed'
          : danger
          ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30'
          : active
          ? 'bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400'
          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      {icon && <span className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500">{icon}</span>}
      <span className="flex-1 truncate">{label}</span>
      {active && (
        <span className="w-1.5 h-1.5 rounded-full bg-brand-600 dark:bg-brand-400" />
      )}
    </button>
  );
};

export const DropdownDivider: React.FC = () => (
  <div className="my-1 border-t border-slate-100 dark:border-slate-800" role="separator" />
);

