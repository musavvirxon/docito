import { useRef, useState, useEffect, Suspense, ComponentType, lazy } from 'react';

interface LazySectionProps {
  /** Factory function returning the lazy import, e.g. () => import('./FAQ') */
  factory: () => Promise<{ default: ComponentType }>;
  /** Vertical margin around the root to trigger loading early (default: 200px) */
  rootMargin?: string;
  /** Fallback shown while loading */
  fallback?: React.ReactNode;
}

// Lightweight skeleton matching the SectionSkeleton in PremiumHome
const DefaultFallback = () => (
  <div className="w-full py-16 flex items-center justify-center">
    <div className="animate-pulse w-full max-w-6xl mx-auto px-4">
      <div className="h-8 w-48 bg-muted rounded mb-6 mx-auto" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-32 bg-muted rounded" />
        <div className="h-32 bg-muted rounded" />
        <div className="h-32 bg-muted rounded" />
      </div>
    </div>
  </div>
);

/**
 * Defers both the dynamic import AND rendering of a lazy component
 * until the placeholder enters (or is near) the viewport.
 *
 * Unlike raw <Suspense> + lazy(), this prevents the browser from
 * downloading and evaluating JS for off-screen sections on initial load,
 * significantly reducing main-thread work.
 */
export default function LazySection({ factory, rootMargin = '300px', fallback }: LazySectionProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [Component, setComponent] = useState<ComponentType | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    // If IntersectionObserver isn't available, load immediately
    if (typeof IntersectionObserver === 'undefined') {
      const LazyComp = lazy(factory);
      setComponent(() => LazyComp);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          const LazyComp = lazy(factory);
          setComponent(() => LazyComp);
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [factory, rootMargin]);

  if (!Component) {
    // Render a minimal sentinel div; use min-height to give IO something to observe
    return <div ref={sentinelRef} className="min-h-[100px]">{fallback ?? <DefaultFallback />}</div>;
  }

  return (
    <Suspense fallback={fallback ?? <DefaultFallback />}>
      <Component />
    </Suspense>
  );
}
