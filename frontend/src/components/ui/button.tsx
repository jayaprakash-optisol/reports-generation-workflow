import { ButtonHTMLAttributes, forwardRef } from 'react';

import { cn } from '../../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 text-white shadow-glow hover:shadow-lg hover:shadow-indigo-500/30 focus-visible:ring-indigo-400',
  secondary:
    'bg-slate-800 text-slate-100 border border-slate-700 hover:border-slate-500 hover:bg-slate-800/70',
  ghost: 'bg-transparent text-slate-200 hover:bg-slate-800',
  outline:
    'border border-slate-700 text-slate-100 hover:bg-slate-900 hover:border-slate-500 transition',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-60 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent border-white" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
