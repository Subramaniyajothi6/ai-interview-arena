import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";

// Name and avatar in the header. With `href` it links to the account page,
// as on most websites.
export function UserBadge({
  name,
  subtitle,
  avatarUrl,
  dark = false,
  href,
}: {
  name: string;
  subtitle: string;
  avatarUrl?: string | null;
  dark?: boolean;
  href?: string;
}) {
  const content = (
    <>
      <Avatar name={name} url={avatarUrl} className={dark ? "bg-ink" : "bg-primary-600"} />
      <span className="hidden sm:block">
        <span className="block text-[13px] font-semibold">{name || "Your account"}</span>
        <span className="block text-xs text-muted">{subtitle}</span>
      </span>
    </>
  );
  if (!href) return <div className="flex items-center gap-2.5">{content}</div>;
  return (
    <Link
      href={href}
      title="Your profile"
      // Starts with the visible text so voice control ("click Test Candidate") matches.
      aria-label={`${name || "Your account"} ${subtitle}, your profile`}
      className="-mx-2 flex items-center gap-2.5 rounded-control px-2 py-1 text-text no-underline hover:bg-bg focus-visible:outline-2 focus-visible:outline-primary-600"
    >
      {content}
    </Link>
  );
}
