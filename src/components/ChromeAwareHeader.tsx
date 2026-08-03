import Header from "@/components/Header";
import { usePublicChrome } from "@/contexts/PublicChromeContext";

/**
 * Renders the legacy Header only when a layout has not already provided one.
 * Prevents double top navigation bars on pages rendered inside PublicLayout.
 */
export default function ChromeAwareHeader() {
  const chrome = usePublicChrome();
  if (chrome.headerProvided) return null;
  return <Header />;
}
