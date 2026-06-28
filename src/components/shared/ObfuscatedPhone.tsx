import { useMemo, useState, type ReactNode } from "react";

/**
 * Anti-scraper phone link.
 * - The real number is never present in the static HTML (stored base64-encoded
 *   and split into chunks, then assembled at render time in the browser).
 * - The `href` is only attached on user intent (hover/focus/click), so headless
 *   crawlers that don't execute interaction handlers never see a `tel:` URI.
 * - Displayed digits use Unicode bidi-isolation so naive regex scrapers fail.
 */
type Props = {
  /** Base64 chunks of the E.164 number (without "+"). Split to defeat string scans. */
  parts: string[];
  /** Human-readable display (can include spaces / dashes). */
  display: string;
  className?: string;
  children?: ReactNode;
};

function decode(parts: string[]): string {
  try {
    return "+" + parts.map((p) => atob(p)).join("");
  } catch {
    return "";
  }
}

export function ObfuscatedPhone({ parts, display, className, children }: Props) {
  const [armed, setArmed] = useState(false);
  const tel = useMemo(() => (armed ? decode(parts) : ""), [armed, parts]);

  return (
    <a
      href={tel ? `tel:${tel}` : undefined}
      onMouseEnter={() => setArmed(true)}
      onFocus={() => setArmed(true)}
      onTouchStart={() => setArmed(true)}
      onClick={(e) => {
        if (!tel) {
          e.preventDefault();
          setArmed(true);
        }
      }}
      rel="nofollow noopener"
      aria-label="Call us"
      className={className}
      data-protected="phone"
    >
      {children}
      {/* Bidi-isolate display so the digits are not a contiguous regex match */}
      <span dir="ltr" style={{ unicodeBidi: "isolate" }}>
        {display.split("").map((c, i) => (
          <span key={i}>{c}</span>
        ))}
      </span>
    </a>
  );
}
