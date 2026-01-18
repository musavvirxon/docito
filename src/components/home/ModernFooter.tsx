// src/components/home/ModernFooter.tsx
import PremiumFooter from "@/components/home/premium/PremiumFooter";
import { usePublicChrome } from "@/contexts/PublicChromeContext";

/**
 * Compatibility wrapper:
 * - Pages that still import ModernFooter should NOT render a second footer when PublicLayout already provides one.
 * - Outside PublicLayout, this renders the premium footer.
 */
const ModernFooter = () => {
  const chrome = usePublicChrome();
  if (chrome.footerProvided) return null;
  return <PremiumFooter />;
};

export default ModernFooter;
