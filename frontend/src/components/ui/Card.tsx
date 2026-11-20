import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'ghost';
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  className = '',
  children,
  ...props
}) => {
  const variantStyles = {
    default:
      'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card dark:shadow-card-dark',
    subtle:
      'bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80',
    ghost:
      'bg-transparent border border-dashed border-slate-300 dark:border-slate-800',
  };

  return (
    <div
      className={`rounded-xl overflow-hidden transition-colors ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`p-5 pb-3 flex flex-col gap-1 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <h3
    className={`text-base font-semibold text-slate-900 dark:text-slate-100 tracking-tight ${className}`}
    {...props}
  >
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <p className={`text-xs text-slate-500 dark:text-slate-400 ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`p-5 pt-2 text-sm text-slate-700 dark:text-slate-300 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div
    className={`px-5 py-3 border-t border-slate-100 dark:border-slate-800/70 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 ${className}`}
    {...props}
  >
    {children}
  </div>
);

