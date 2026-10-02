import { Logo } from "@/components/ui/logo";

// Split layout from the Login / Registration boards: brand panel on the left
// (desktop only), form centred on the right.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-bg">
      <aside className="relative hidden w-[540px] shrink-0 flex-col justify-between overflow-hidden bg-ink p-12 text-white lg:flex">
        <svg
          width="520"
          height="520"
          viewBox="0 0 520 520"
          aria-hidden="true"
          className="pointer-events-none absolute -right-[210px] -bottom-[210px]"
        >
          <circle cx="260" cy="260" r="250" fill="none" stroke="#2A2745" strokeWidth="2" />
          <circle cx="260" cy="260" r="190" fill="none" stroke="#2A2745" strokeWidth="2" />
          <circle cx="260" cy="260" r="130" fill="none" stroke="#332F55" strokeWidth="2" />
          <circle cx="260" cy="260" r="70" fill="#6D28D9" />
        </svg>
        <div className="relative">
          <Logo tone="light" />
        </div>
        <div className="relative flex flex-col gap-[22px]">
          <span className="text-xs font-bold tracking-[0.14em] text-primary-300 uppercase">
            AI mock interviews
          </span>
          <p className="font-display text-[58px] leading-[1.02] font-bold tracking-[-0.035em]">
            Walk into your next interview{" "}
            <span className="text-primary-300">already warmed up.</span>
          </p>
          <p className="max-w-[400px] text-lg leading-relaxed text-[#C9C6D6]">
            Personalized questions, adaptive follow-ups and feedback you can act on.
          </p>
        </div>
        <p className="relative text-xs text-[#8B88A3]">© 2026 AI Interview Arena</p>
      </aside>

      <main className="flex grow flex-col">
        <div className="px-4 pt-6 sm:px-8 lg:hidden">
          <Logo />
        </div>
        <div className="flex grow items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-[420px] xl:has-[.auth-wide]:max-w-[662px]">{children}</div>
        </div>
      </main>
    </div>
  );
}
