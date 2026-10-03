// Line chart of overall score (0–100) per interview, as in the "Score trend" card.
export function TrendChart({
  points,
  height = 180,
  width = 640,
}: {
  points: { label: string; score: number }[];
  height?: number;
  width?: number; // drawing width; the SVG always scales to its container
}) {
  const pad = { top: 16, right: 20, bottom: 28, left: 32 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const x = (i: number) =>
    pad.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (score: number) => pad.top + innerH - (score / 100) * innerH;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.score)}`).join(" ");
  const area = `${line} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const last = points.at(-1);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Score trend: ${points.map((p) => `${p.label} ${p.score}`).join(", ")}`}
    >
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={y(v)}
            y2={y(v)}
            className="stroke-border-soft"
            strokeWidth="1"
          />
          <text x={pad.left - 8} y={y(v) + 4} textAnchor="end" fontSize="11" className="fill-muted">
            {v}
          </text>
        </g>
      ))}
      <path d={area} className="fill-primary-600" opacity="0.08" />
      <path
        d={line}
        fill="none"
        className="stroke-primary-600"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <g key={i}>
          <circle
            cx={x(i)}
            cy={y(p.score)}
            r="4"
            className="fill-surface stroke-primary-600"
            strokeWidth="2"
          />
          <text x={x(i)} y={height - 8} textAnchor="middle" fontSize="11" className="fill-muted">
            {p.label}
          </text>
        </g>
      ))}
      {last && (
        <text
          x={x(points.length - 1)}
          y={y(last.score) - 12}
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          className="fill-text"
        >
          {last.score}
        </text>
      )}
    </svg>
  );
}
