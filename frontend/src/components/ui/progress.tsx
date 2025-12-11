import { HTMLAttributes } from 'react';

import { cn } from '../../lib/utils';

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
}

export function Progress({ value, className, ...props }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value ?? 0));
  return (
    <div
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-slate-800', className)}
      {...props}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-400 transition-all"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
