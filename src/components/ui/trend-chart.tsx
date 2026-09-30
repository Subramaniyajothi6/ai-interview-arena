// Line chart of overall score (0–100) per interview, as in the "Score trend" card.
export function TrendChart({
  points,
  height = 180,
}: {
  points: { label: string; score: number }[];
  height?: number;
}) {
  const width = 640;
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
            stroke="#F0EEE9"
            strokeWidth="1"
          />
          <text x={pad.left - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#5F5C68">
            {v}
          </text>
        </g>
      ))}
      <path d={area} fill="#6D28D9" opacity="0.08" />
      <path d={line} fill="none" stroke="#6D28D9" strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.score)} r="4" fill="#fff" stroke="#6D28D9" strokeWidth="2" />
          <text x={x(i)} y={height - 8} textAnchor="middle" fontSize="11" fill="#5F5C68">
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
          fill="#1C1B22"
        >
          {last.score}
        </text>
      )}
    </svg>
  );
}
