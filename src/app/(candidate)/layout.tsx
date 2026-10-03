import { redirect } from "next/navigation";
import { logout } from "@/app/(auth)/actions";
import { BottomNav, PageTitle, SidebarNav } from "@/components/layout/candidate-nav";
import { NotificationBell } from "@/components/layout/notification-bell";
import { UserBadge } from "@/components/layout/user-badge";
import { Icon } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { requireUser } from "@/lib/auth";
import { getNotifications } from "@/lib/data/notifications";

export default async function CandidateLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, supabase } = await requireUser();
  // The candidate area is for candidates; admins use the admin console.
  if (profile.role === "admin") redirect("/admin");

  // "Next practice" tip: the top improvement area from the latest report.
  const [{ data: latest }, notifications] = await Promise.all([
    supabase
      .from("interview_reports")
      .select("improvements")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getNotifications(supabase, user.id),
  ]);
  const tip = latest?.improvements?.[0];

  return (
    <div className="flex min-h-dvh bg-bg">
      <aside className="sticky top-0 hidden h-dvh w-[232px] print:!hidden shrink-0 flex-col gap-1 border-r border-border bg-surface px-3.5 py-[22px] lg:flex">
        <div className="px-2 pb-[26px]">
          <Logo href="/dashboard" />
        </div>
        <SidebarNav />
        <div className="grow" />
        <div className="mb-3 flex flex-col gap-2 rounded-xl bg-primary-50 p-3.5">
          <span className="text-[13px] font-semibold text-primary-900">Next practice</span>
          <span className="text-xs leading-snug text-muted">
            {tip ?? "Complete your first interview to get a personalised focus area."}
          </span>
        </div>
        <form action={logout}>
          <button type="submit" className="nav-link w-full cursor-pointer border-0 bg-transparent">
            <Icon name="logout" />
            Logout
          </button>
        </form>
      </aside>

      <div className="flex min-w-0 grow flex-col">
        <header className="sticky top-0 z-10 flex h-[72px] shrink-0 print:hidden items-center justify-between gap-4 border-b border-border bg-surface px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="lg:hidden">
              <Logo href="/dashboard" label="" />
            </span>
            <PageTitle />
          </div>
          <div className="flex items-center gap-2 sm:gap-3.5">
            <ThemeToggle variant="responsive" />
            <NotificationBell items={notifications} />
            <UserBadge
              name={profile.full_name}
              subtitle="Candidate"
              avatarUrl={profile.avatar_url}
            />
            <form action={logout} className="lg:hidden">
              <button type="submit" className="btn btn-ghost w-11 px-0" aria-label="Log out">
                <Icon name="logout" />
              </button>
            </form>
          </div>
        </header>
        <main className="grow px-4 py-6 pb-24 sm:px-8 lg:pb-8 print:p-0">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
