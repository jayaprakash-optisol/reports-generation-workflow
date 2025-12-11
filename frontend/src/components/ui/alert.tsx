import type { HTMLAttributes } from 'react';

import { cn } from '../../lib/utils';

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'error' | 'info' | 'success';
}

export function Alert({ className, variant = 'info', ...props }: AlertProps) {
  const variants: Record<AlertProps['variant'], string> = {
    info: 'bg-slate-900/70 border-slate-700 text-slate-100',
    error: 'bg-red-950/60 border-red-800 text-red-100',
    success: 'bg-emerald-950/60 border-emerald-800 text-emerald-100',
  };

  return (
    <div
      className={cn(
        'w-full rounded-lg border px-3 py-2 text-sm shadow-sm flex items-start gap-2',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
