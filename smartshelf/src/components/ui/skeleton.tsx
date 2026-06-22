import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-xl bg-[rgba(15,23,42,0.06)]', className)}
      {...props}
    />
  );
}

export { Skeleton };
