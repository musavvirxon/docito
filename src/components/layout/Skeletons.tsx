import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface SkeletonProps {
  className?: string;
}

// Card skeleton for dashboard stats
export function CardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("p-6 border rounded-lg bg-card", className)}>
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-8 w-16 mb-4" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

// Table row skeleton
export function TableRowSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("flex items-center gap-4 p-4 border-b", className)}>
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
  );
}

// List skeleton for orders/items
export function ListItemSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("flex items-center justify-between p-3 bg-muted/50 rounded-lg", className)}>
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

// Full page loading skeleton
export function PageSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("space-y-6 p-6", className)}>
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      
      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      
      {/* Content cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 border rounded-lg bg-card space-y-4">
          <Skeleton className="h-6 w-32" />
          {[...Array(4)].map((_, i) => (
            <ListItemSkeleton key={i} />
          ))}
        </div>
        <div className="p-6 border rounded-lg bg-card space-y-4">
          <Skeleton className="h-6 w-32" />
          {[...Array(4)].map((_, i) => (
            <ListItemSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Dashboard sidebar skeleton
export function SidebarSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("w-64 h-screen border-r bg-card p-4 space-y-2", className)}>
      <Skeleton className="h-8 w-24 mb-6" />
      {[...Array(8)].map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  );
}

// Form skeleton
export function FormSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-32 mt-4" />
    </div>
  );
}

// Search results skeleton
export function SearchResultsSkeleton({ count = 6, className }: SkeletonProps & { count?: number }) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="p-4 border rounded-lg bg-card">
          <Skeleton className="h-40 w-full rounded-lg mb-4" />
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-4" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
