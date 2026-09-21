import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  indicatorClassName?: string;
}

export function Progress({ value = 0, max = 100, className, indicatorClassName, ...props }: ProgressProps) {
  const percentage = Math.min(Math.max(0, (value / max) * 100), 100);

  return (
    <div
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-[#eae5df]', className)}
      {...props}
    >
      <div
        className={cn('h-full bg-[#ca9881] transition-all duration-300 ease-in-out', indicatorClassName)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
