// File: src/components/Visuals/illustrations/PricingMatrixIllustration.tsx

import React from "react";
import { cn } from "@/lib/utils";

export default function PricingMatrixIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 920 520"
      className={cn("select-none", className)}
      role="img"
      aria-label="Premium pricing illustration"
    >
      <defs>
        <linearGradient id="pmg1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0.55" />
          <stop offset="1" stopColor="hsl(var(--foreground))" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="pmg2" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
          <stop offset="1" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
        </linearGradient>
        <filter id="pmBlur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>

      {/* Soft blobs */}
      <circle cx="270" cy="155" r="110" fill="url(#pmg2)" filter="url(#pmBlur)" opacity="0.9" />
      <circle cx="650" cy="110" r="90" fill="url(#pmg2)" filter="url(#pmBlur)" opacity="0.9" />
      <circle cx="640" cy="360" r="130" fill="url(#pmg1)" filter="url(#pmBlur)" opacity="0.75" />

      {/* Glass cards */}
      <g opacity="0.92">
        <rect x="64" y="88" width="792" height="360" rx="28" fill="hsl(var(--background))" fillOpacity="0.35" stroke="hsl(var(--border))" strokeOpacity="0.6" />
        <rect x="92" y="124" width="250" height="296" rx="22" fill="hsl(var(--background))" fillOpacity="0.35" stroke="hsl(var(--border))" strokeOpacity="0.55" />
        <rect x="364" y="124" width="156" height="296" rx="22" fill="hsl(var(--background))" fillOpacity="0.35" stroke="hsl(var(--border))" strokeOpacity="0.55" />
        <rect x="532" y="124" width="156" height="296" rx="22" fill="hsl(var(--background))" fillOpacity="0.35" stroke="hsl(var(--primary))" strokeOpacity="0.35" />
        <rect x="700" y="124" width="156" height="296" rx="22" fill="hsl(var(--background))" fillOpacity="0.35" stroke="hsl(var(--border))" strokeOpacity="0.55" />
      </g>

      {/* Accent strokes */}
      <path d="M532 152h156" stroke="hsl(var(--primary))" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />
      <path d="M92 156h250" stroke="hsl(var(--foreground))" strokeOpacity="0.12" strokeWidth="3" strokeLinecap="round" />

      {/* Minimal “content lines” */}
      {Array.from({ length: 9 }).map((_, i) => (
        <g key={i} opacity="0.8">
          <rect x="116" y={204 + i * 24} width={160 - (i % 3) * 18} height="8" rx="4" fill="hsl(var(--foreground))" fillOpacity="0.14" />
          <rect x="384" y={204 + i * 24} width="108" height="8" rx="4" fill="hsl(var(--foreground))" fillOpacity="0.10" />
          <rect x="552" y={204 + i * 24} width="108" height="8" rx="4" fill="hsl(var(--primary))" fillOpacity="0.14" />
          <rect x="720" y={204 + i * 24} width="108" height="8" rx="4" fill="hsl(var(--foreground))" fillOpacity="0.10" />
        </g>
      ))}

      {/* Premium “spark” */}
      <g transform="translate(720 86)">
        <path
          d="M56 6l7 18 18 7-18 7-7 18-7-18-18-7 18-7 7-18z"
          fill="hsl(var(--primary))"
          fillOpacity="0.45"
        />
      </g>
    </svg>
  );
}
