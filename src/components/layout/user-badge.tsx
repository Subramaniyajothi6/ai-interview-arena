import { initials } from "@/lib/auth";

export function UserBadge({
  name,
  subtitle,
  dark = false,
}: {
  name: string;
  subtitle: string;
  dark?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
          dark ? "bg-ink" : "bg-primary-600"
        }`}
        aria-hidden="true"
      >
        {initials(name)}
      </span>
      <span className="hidden sm:block">
        <span className="block text-[13px] font-semibold">{name || "Your account"}</span>
        <span className="block text-xs text-muted">{subtitle}</span>
      </span>
    </div>
  );
}
