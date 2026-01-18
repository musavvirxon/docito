// src/components/home/AppleNavbar.tsx
import PremiumTopNav from "@/components/home/premium/PremiumTopNav";
import { usePublicChrome } from "@/contexts/PublicChromeContext";

/**
 * Compatibility wrapper:
 * - Pages that still import AppleNavbar should NOT render a second header when PublicLayout already provides one.
 * - Outside PublicLayout, this renders the premium top nav.
 */
const AppleNavbar = () => {
  const chrome = usePublicChrome();
  if (chrome.headerProvided) return null;
  return <PremiumTopNav />;
};

export default AppleNavbar;
