import * as React from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-[#dcd7cf] bg-[#f7f5f2]/60 my-4',
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f5ece7] text-[#ca9881] mb-4 ring-8 ring-[#f5ece7]/60">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-base font-serif font-semibold text-[#262a2a]">{title}</h3>
      <p className="mt-1 text-sm text-[#5c6463] max-w-sm">{description}</p>
      
      {(actionLabel && (actionHref || onAction)) && (
        <div className="mt-5">
          {actionHref ? (
            <Link href={actionHref}>
              <Button size="sm">{actionLabel}</Button>
            </Link>
          ) : (
            <Button size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
