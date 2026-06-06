// src/components/ui/Button.tsx
'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'danger' | 'outline' | 'soft';
type Size    = 'sm' | 'md' | 'lg' | 'xl';

const variantMap: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-500 shadow-float/50 active:scale-[0.98]',
  ghost:   'bg-transparent text-ink-muted hover:bg-surface-overlay hover:text-ink',
  danger:  'bg-red-50 text-red-500 hover:bg-red-100 border border-red-100',
  outline: 'bg-transparent border border-surface-border text-ink hover:bg-surface-muted',
  soft:    'bg-brand-50 text-brand-600 hover:bg-brand-100 border border-brand-100',
};

const sizeMap: Record<Size, string> = {
  sm:  'px-3 py-1.5 text-xs rounded-lg',
  md:  'px-4 py-2.5 text-sm rounded-xl',
  lg:  'px-6 py-3 text-sm rounded-xl',
  xl:  'px-6 py-4 text-base rounded-2xl',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant;
  size?:     Size;
  loading?:  boolean;
  children:  ReactNode;
  full?:     boolean;
}

export function Button({
  variant = 'primary', size = 'md', loading,
  children, className = '', disabled, full, ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-medium
        transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
        ${variantMap[variant]} ${sizeMap[size]}
        ${full ? 'w-full' : ''}
        ${className}
      `}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}