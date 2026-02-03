// src/components/ScrollToTop.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      if (location.hash) {
        const raw = location.hash.startsWith("#") ? location.hash.slice(1) : location.hash;
        const targetId = decodeURIComponent(raw);
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ block: "start" });
          return;
        }
      }

      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(raf);
  }, [location.pathname, location.search, location.hash]);

  return null;
}
