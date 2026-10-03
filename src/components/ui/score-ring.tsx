import { bandColor } from "@/lib/score";

// Circular score (0–100) from the design's "Score & criteria" component.
// The arc is green, amber or red by score band.
export function ScoreRing({
  score,
  size = 120,
  stroke = 11,
  label = "/ 100",
}: {
  score: number | null;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const value = Math.max(0, Math.min(100, score ?? 0));
  const c = size / 2;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-primary-100"
          strokeWidth={stroke}
        />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          style={{ stroke: score === null ? "var(--color-primary-600)" : bandColor(value) }}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * circumference} ${circumference}`}
          transform={`rotate(-90 ${c} ${c})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-display font-bold leading-none tracking-[-0.03em] text-text"
          style={{ fontSize: Math.round(size / 4) }}
        >
          {score ?? "—"}
        </span>
        <span className="mt-1 text-xs text-muted">{label}</span>
      </div>
      <span className="sr-only">Score {score ?? "not available"} out of 100</span>
    </div>
  );
}
