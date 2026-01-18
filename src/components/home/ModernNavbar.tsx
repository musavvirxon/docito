// src/components/home/ModernNavbar.tsx
import PremiumTopNav from "@/components/home/premium/PremiumTopNav";
import { usePublicChrome } from "@/contexts/PublicChromeContext";

/**
 * Compatibility wrapper:
 * - Pages that still import ModernNavbar should NOT render a second header when PublicLayout already provides one.
 * - Outside PublicLayout, this renders the premium top nav.
 */
const ModernNavbar = () => {
  const chrome = usePublicChrome();
  if (chrome.headerProvided) return null;
  return <PremiumTopNav />;
};

export default ModernNavbar;
