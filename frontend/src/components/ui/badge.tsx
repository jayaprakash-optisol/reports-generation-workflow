import { HTMLAttributes } from 'react';

import { cn } from '../../lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'success';
}

export function Badge({ className, variant = 'primary', ...props }: BadgeProps) {
  const variants: Record<NonNullable<BadgeProps['variant']>, string> = {
    primary: 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/30',
    secondary: 'bg-slate-800 text-slate-200 border border-slate-700',
    outline: 'border border-slate-700 text-slate-200',
    success: 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
