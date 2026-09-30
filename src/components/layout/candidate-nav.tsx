"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";

export const CANDIDATE_NAV: { href: string; label: string; short: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Dashboard", short: "Home", icon: "dashboard" },
  { href: "/interview/new", label: "New Interview", short: "Practice", icon: "plusCircle" },
  { href: "/history", label: "Interview History", short: "History", icon: "history" },
  { href: "/plan", label: "Improvement Plan", short: "Plan", icon: "map" },
  { href: "/profile", label: "Profile", short: "Profile", icon: "user" },
];

const TITLES: [string, string][] = [
  ["/interview/new", "New interview"],
  ["/interview", "Interview"],
  ["/reports", "Evaluation report"],
  ...CANDIDATE_NAV.map((n) => [n.href, n.label] as [string, string]),
];

function isActive(pathname: string, href: string) {
  if (href === "/interview/new") return pathname.startsWith("/interview");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Candidate" className="flex flex-col gap-1">
      {CANDIDATE_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="nav-link"
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
        >
          <Icon name={item.icon} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

// Phone layout: bottom tab bar, as in the "Mobile dashboard" board.
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Candidate"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {CANDIDATE_NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold no-underline ${
              active ? "text-primary-600" : "text-muted hover:text-text"
            }`}
          >
            <Icon name={item.icon} size={20} />
            {item.short}
          </Link>
        );
      })}
    </nav>
  );
}

export function PageTitle() {
  const pathname = usePathname();
  const title = TITLES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return <h1 className="text-[22px]">{title?.[1] ?? "Interview Arena"}</h1>;
}
