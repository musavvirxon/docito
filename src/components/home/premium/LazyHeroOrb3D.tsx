import { memo, useCallback, useEffect, useState, lazy, Suspense } from "react";
import HeroStaticFallback from "./HeroStaticFallback";

// Dynamically import the heavy 3D component - this prevents three.js from loading until needed
const HeroOrb3D = lazy(() => import("./HeroOrb3D"));

function LazyHeroOrb3D() {
  const [shouldLoad3D, setShouldLoad3D] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Detect mobile on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || "ontouchstart" in window);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isMobile || hasInteracted) return;

    const handleInteraction = () => {
      setHasInteracted(true);
      setShouldLoad3D(true);
    };

    window.addEventListener("scroll", handleInteraction, { passive: true, once: true } as any);
    window.addEventListener("click", handleInteraction, { once: true } as any);
    window.addEventListener("touchstart", handleInteraction, { passive: true, once: true } as any);

    return () => {
      window.removeEventListener("scroll", handleInteraction as any);
      window.removeEventListener("click", handleInteraction as any);
      window.removeEventListener("touchstart", handleInteraction as any);
    };
  }, [isMobile, hasInteracted]);

  const handleFallbackClick = useCallback(() => {
    setShouldLoad3D(true);
    setHasInteracted(true);
  }, []);

  if (!shouldLoad3D) {
    return <HeroStaticFallback onClick={handleFallbackClick} />;
  }

  return (
    <Suspense fallback={<HeroStaticFallback onClick={handleFallbackClick} />}>
      <HeroOrb3D />
    </Suspense>
  );
}

export default memo(LazyHeroOrb3D);
