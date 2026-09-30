"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";

export const ADMIN_NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/candidates", label: "Candidates", icon: "users" },
  { href: "/admin/interviews", label: "Interviews", icon: "message" },
  { href: "/admin/questions", label: "Question Bank", icon: "book" },
  { href: "/admin/reports", label: "Reports", icon: "file" },
  { href: "/admin/analytics", label: "Analytics", icon: "chart" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];

function isActive(pathname: string, href: string) {
  return href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebarNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex flex-col gap-1">
      {ADMIN_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="dnav-link"
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
        >
          <Icon name={item.icon} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

// Horizontal, scrollable version for small screens.
export function AdminTopNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Admin"
      className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-3 py-2 lg:hidden"
    >
      {ADMIN_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="nav-link shrink-0 !h-9 whitespace-nowrap"
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function AdminPageTitle() {
  const pathname = usePathname();
  const item = [...ADMIN_NAV].reverse().find((n) => isActive(pathname, n.href));
  return <h1 className="text-[22px]">{item?.label ?? "Admin"}</h1>;
}

// Page-level action shown in the header bar (e.g. "Add question" on the question bank).
export function AdminHeaderAction() {
  const pathname = usePathname();
  if (pathname !== "/admin/questions") return null;
  return (
    <Link href="/admin/questions?new=1" className="btn hidden sm:inline-flex">
      <Icon name="plusCircle" size={16} />
      Add question
    </Link>
  );
}
