import React, { useState } from 'react';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
  src?: string;
  alt?: string;
  size?: AvatarSize;
}

const sizeStyles: Record<AvatarSize, { box: string; text: string }> = {
  sm: { box: 'w-6 h-6', text: 'text-[10px]' },
  md: { box: 'w-8 h-8', text: 'text-xs' },
  lg: { box: 'w-10 h-10', text: 'text-sm' },
};

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  alt,
  size = 'md',
  className = '',
  ...props
}) => {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(name);
  const { box, text } = sizeStyles[size];

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full font-semibold select-none overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 ${box} ${text} ${className}`}
      aria-label={name ? `${name}'s avatar` : 'User avatar'}
      {...props}
    >
      {src && !imageError ? (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

