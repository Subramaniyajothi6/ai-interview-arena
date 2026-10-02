import { Avatar } from "@/components/ui/avatar";

export function UserBadge({
  name,
  subtitle,
  avatarUrl,
  dark = false,
}: {
  name: string;
  subtitle: string;
  avatarUrl?: string | null;
  dark?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar name={name} url={avatarUrl} className={dark ? "bg-ink" : "bg-primary-600"} />
      <span className="hidden sm:block">
        <span className="block text-[13px] font-semibold">{name || "Your account"}</span>
        <span className="block text-xs text-muted">{subtitle}</span>
      </span>
    </div>
  );
}
