// File: src/components/howItWorks/VectorNetworkIllustration.tsx
import LineDrawAnimationWrapper from "./LineDrawAnimationWrapper";

type Props = {
  className?: string;
};

export default function VectorNetworkIllustration({ className }: Props) {
  return (
    <LineDrawAnimationWrapper className={className} durationMs={2400}>
      <svg viewBox="0 0 720 520" role="img" aria-label="Docito ecosystem workflow" className="w-full h-auto">
        <defs>
          <linearGradient id="docitoLine" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
            <stop offset="50%" stopColor="hsl(var(--accent))" stopOpacity="0.25" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
          </linearGradient>
          <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background grid */}
        <g opacity="0.18" className="text-foreground">
          {Array.from({ length: 9 }).map((_, i) => (
            <path
              key={`h-${i}`}
              d={`M 60 ${80 + i * 44} H 660`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="3 8"
            />
          ))}
          {Array.from({ length: 13 }).map((_, i) => (
            <path
              key={`v-${i}`}
              d={`M ${80 + i * 48} 60 V 460`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="3 8"
            />
          ))}
        </g>

        {/* Connection lines (draw-on) */}
        <g filter="url(#softGlow)">
          <path
            data-draw-path
            d="M 120 180 C 210 120, 280 120, 330 160"
            fill="none"
            stroke="url(#docitoLine)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            data-draw-path
            d="M 330 160 C 400 210, 440 240, 500 230"
            fill="none"
            stroke="url(#docitoLine)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            data-draw-path
            d="M 330 160 C 400 150, 460 120, 520 120"
            fill="none"
            stroke="url(#docitoLine)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            data-draw-path
            d="M 330 160 C 400 300, 470 340, 560 340"
            fill="none"
            stroke="url(#docitoLine)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            data-draw-path
            d="M 520 120 C 560 135, 585 155, 600 180"
            fill="none"
            stroke="url(#docitoLine)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>

        {/* Floating dots (one-shot) */}
        <g>
          <circle data-float-dot cx="220" cy="140" r="4" fill="hsl(var(--primary))" opacity="0.35" />
          <circle data-float-dot cx="430" cy="210" r="4" fill="hsl(var(--accent))" opacity="0.35" />
          <circle data-float-dot cx="460" cy="120" r="4" fill="hsl(var(--primary))" opacity="0.35" />
          <circle data-float-dot cx="470" cy="310" r="4" fill="hsl(var(--accent))" opacity="0.35" />
          <circle data-float-dot cx="585" cy="155" r="4" fill="hsl(var(--primary))" opacity="0.35" />
        </g>

        {/* Nodes */}
        <Node x={120} y={180} label="Care Seeker" tone="primary" />
        <Node x={330} y={160} label="Front Desk" tone="muted" />
        <Node x={520} y={120} label="Doctor" tone="primary" />
        <Node x={500} y={230} label="Lab Tech" tone="muted" />
        <Node x={560} y={340} label="Imaging Tech" tone="muted" />
        <Node x={600} y={180} label="Pharmacy" tone="primary" />
      </svg>
    </LineDrawAnimationWrapper>
  );
}

type NodeProps = {
  x: number;
  y: number;
  label: string;
  tone: "primary" | "muted";
};

function Node({ x, y, label, tone }: NodeProps) {
  const ring = tone === "primary" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))";
  const fill = tone === "primary" ? "hsl(var(--primary))" : "hsl(var(--foreground))";

  return (
    <g>
      <circle cx={x} cy={y} r={18} fill="hsl(var(--background))" stroke={ring} strokeWidth={2} opacity={0.9} />
      <circle cx={x} cy={y} r={6} fill={fill} opacity={tone === "primary" ? 0.55 : 0.35} />
      <text
        x={x}
        y={y + 38}
        textAnchor="middle"
        fontSize="13"
        fill="hsl(var(--muted-foreground))"
        style={{ letterSpacing: "0.02em" }}
      >
        {label}
      </text>
    </g>
  );
}
