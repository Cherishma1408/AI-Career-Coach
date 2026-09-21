import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-[#f5ece7] text-[#9e5e43] border-[#ebdcd4]',
    secondary: 'bg-[#eae5df] text-[#374241] border-[#dcd7cf]',
    outline: 'border-[#dcd7cf] text-[#262a2a] bg-white',
    success: 'bg-[#edf7ed] text-[#2e6333] border-[#cde5cf]',
    warning: 'bg-[#fdf6ea] text-[#8c5812] border-[#fae5c3]',
    destructive: 'bg-[#fbeaea] text-[#9c2f2f] border-[#f4c7c7]',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
