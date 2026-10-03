import { bandColor } from "@/lib/score";

// Horizontal score bars, one per evaluation criterion, coloured green /
// amber / red by score band.
export function CriteriaBars({
  items,
  labelWidth = 128,
}: {
  items: { label: string; score: number | null }[];
  labelWidth?: number;
}) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => {
        const value = Math.max(0, Math.min(100, item.score ?? 0));
        return (
          <li key={item.label} className="flex items-center gap-3.5 text-[13px]">
            <span className="shrink-0" style={{ width: labelWidth }}>
              {item.label}
            </span>
            <span
              className="relative h-2 grow overflow-hidden rounded bg-border-soft"
              role="meter"
              aria-label={item.label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={item.score ?? undefined}
            >
              <span
                className="absolute inset-y-0 left-0 rounded"
                style={{ width: `${value}%`, background: bandColor(value) }}
              />
            </span>
            <span className="w-7 text-right font-display font-bold">{item.score ?? "—"}</span>
          </li>
        );
      })}
    </ul>
  );
}
