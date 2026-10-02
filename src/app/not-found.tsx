import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex h-[72px] items-center border-b border-border bg-surface px-4 sm:px-8">
        <Logo />
      </header>
      <main className="flex grow items-center justify-center px-4 py-16">
        <section className="card flex max-w-md flex-col items-center gap-4 !p-8 text-center">
          <span className="font-display text-5xl font-bold text-primary-600">404</span>
          <div>
            <h1 className="text-xl">Page not found</h1>
            <p className="mt-1.5 text-sm text-muted">
              The page you&apos;re looking for doesn&apos;t exist, or you don&apos;t have access to
              it.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard" className="btn">
              Go to dashboard
            </Link>
            <Link href="/" className="btn btn-sec">
              Home
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
