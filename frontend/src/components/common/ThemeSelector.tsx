import React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type Theme } from '@/contexts/ThemeContext';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';

export interface ThemeSelectorProps {
  variant?: 'dropdown' | 'segmented';
  className?: string;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  variant = 'dropdown',
  className = '',
}) => {
  const { theme, setTheme, effectiveTheme } = useTheme();

  const options: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
    { value: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> },
  ];

  if (variant === 'segmented') {
    return (
      <div
        role="radiogroup"
        aria-label="Select theme"
        className={`inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 ${className}`}
      >
        {options.map((opt) => {
          const isSelected = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setTheme(opt.value)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                isSelected
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <Dropdown
      align="right"
      className={className}
      trigger={({ toggle, isOpen }) => (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label={`Current theme: ${theme}. Click to change theme.`}
          className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
        >
          {effectiveTheme === 'dark' ? (
            <Moon className="w-4 h-4 text-brand-400" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500" />
          )}
          <span className="capitalize">{theme}</span>
        </button>
      )}
    >
      {options.map((opt) => (
        <DropdownItem
          key={opt.value}
          label={opt.label}
          icon={opt.icon}
          active={theme === opt.value}
          onClick={() => setTheme(opt.value)}
        />
      ))}
    </Dropdown>
  );
};

