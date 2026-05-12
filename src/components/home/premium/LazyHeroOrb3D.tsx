import { memo, lazy, Suspense } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import HeroStaticFallback from "./HeroStaticFallback";

// Dynamically import with retry logic to handle transient network failures
const HeroOrb3D = lazy(() =>
  import("./HeroOrb3D").catch(() => {
    return new Promise<typeof import("./HeroOrb3D")>((resolve) =>
      setTimeout(() => resolve(import("./HeroOrb3D")), 2000)
    );
  })
);

function LazyHeroOrb3D() {
  return (
    <ErrorBoundary fallback={() => <HeroStaticFallback />}>
      <Suspense fallback={<HeroStaticFallback />}>
        <HeroOrb3D />
      </Suspense>
    </ErrorBoundary>
  );
}

export default memo(LazyHeroOrb3D);
