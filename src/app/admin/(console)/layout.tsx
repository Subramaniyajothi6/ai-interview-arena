import { adminLogout } from "@/app/(auth)/actions";
import { AdminPageTitle, AdminSidebarNav, AdminTopNav } from "@/components/layout/admin-nav";
import { UserBadge } from "@/components/layout/user-badge";
import { Icon } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();

  return (
    <div className="flex min-h-dvh bg-bg">
      <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col gap-1 bg-ink px-3.5 py-[22px] lg:flex">
        <div className="px-2 pb-2">
          <Logo href="/admin" tone="light" />
        </div>
        <div className="px-2 pb-[22px]">
          <span className="chip !bg-ink-2 !text-primary-300">Admin console</span>
        </div>
        <AdminSidebarNav />
        <div className="grow" />
        <form action={adminLogout}>
          <button type="submit" className="dnav-link w-full cursor-pointer border-0 bg-transparent">
            <Icon name="logout" />
            Logout
          </button>
        </form>
      </aside>

      <div className="flex min-w-0 grow flex-col">
        <header className="sticky top-0 z-10 flex h-[72px] shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-4 sm:px-8">
          <AdminPageTitle />
          <div className="flex items-center gap-2">
            <UserBadge name={profile.full_name} subtitle="Administrator" dark />
            <form action={adminLogout} className="lg:hidden">
              <button type="submit" className="btn btn-ghost w-11 px-0" aria-label="Log out">
                <Icon name="logout" />
              </button>
            </form>
          </div>
        </header>
        <AdminTopNav />
        <main className="grow px-4 py-6 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
