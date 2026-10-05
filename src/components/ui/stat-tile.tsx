import { Icon, type IconName } from "./icon";

export function StatTile({
  label,
  value,
  icon,
  hint,
  trend,
}: {
  label: string;
  value: string | number;
  icon?: IconName;
  hint?: string;
  trend?: number | null;
}) {
  return (
    <div className="card flex flex-col gap-2.5 !p-[18px]">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        {icon && (
          <span className="flex size-8 items-center justify-center rounded-[9px] bg-primary-50 text-primary-fg">
            <Icon name={icon} size={16} />
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2.5">
        <span className="font-display text-[30px] font-bold tracking-[-0.02em]">{value}</span>
        {trend != null && trend !== 0 && (
          <span className={`chip !h-[22px] ${trend > 0 ? "chip-ok" : "chip-bad"}`}>
            <Icon name="trendUp" size={12} className={trend < 0 ? "-scale-y-100" : undefined} />
            {trend > 0 ? `+${trend}` : trend}
          </span>
        )}
      </div>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}
