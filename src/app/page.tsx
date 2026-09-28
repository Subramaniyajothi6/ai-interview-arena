import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";
import { ScoreRing } from "@/components/ui/score-ring";

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-ink text-white">
      <svg
        width="820"
        height="820"
        viewBox="0 0 820 820"
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -right-[170px] hidden lg:block"
      >
        <circle cx="410" cy="410" r="400" fill="none" stroke="#211F3A" strokeWidth="2" />
        <circle cx="410" cy="410" r="320" fill="none" stroke="#211F3A" strokeWidth="2" />
        <circle cx="410" cy="410" r="240" fill="none" stroke="#26243F" strokeWidth="2" />
        <circle cx="410" cy="410" r="160" fill="none" stroke="#2C2950" strokeWidth="2" />
      </svg>

      <header className="relative flex h-20 shrink-0 items-center justify-between border-b border-ink-2 px-4 sm:px-8 lg:px-[72px]">
        <Logo tone="light" />
        <nav aria-label="Main" className="flex items-center gap-4 text-sm sm:gap-8">
          <Link
            href="/login"
            className="font-semibold text-white no-underline hover:text-primary-200"
          >
            Log in
          </Link>
          <Link href="/register" className="btn">
            Get started
          </Link>
        </nav>
      </header>

      <main className="relative grid grow items-center gap-14 px-4 py-12 sm:px-8 lg:grid-cols-2 lg:px-[72px]">
        <section className="flex flex-col gap-6">
          <span className="chip !h-[30px] self-start !bg-ink-2 !px-3 !text-primary-300">
            <Icon name="sparkle" size={14} />
            AI-powered mock interviews
          </span>
          <h1 className="text-[40px] leading-none tracking-[-0.04em] sm:text-[62px]">
            Practice interviews that <span className="text-primary-300">adapt to you.</span>
          </h1>
          <p className="max-w-[480px] text-lg leading-relaxed text-[#C9C6D6]">
            Questions built from your resume, role and experience. Follow-ups that react to your
            answers. Clear feedback on every response.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/register" className="btn btn-lg">
              Start a mock interview
              <Icon name="arrowRight" size={16} />
            </Link>
            <Link
              href="/login"
              className="btn btn-lg !border-[#3B3858] !bg-transparent !text-white hover:!bg-ink-2"
            >
              Log in
            </Link>
          </div>
        </section>

        <section aria-label="Sample interview" className="relative hidden h-[540px] md:block">
          <div className="card absolute top-10 left-5 flex w-[450px] flex-col gap-3.5 !border-0 !p-[22px] text-text shadow-[0_24px_48px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-border" />
              <span className="size-2.5 rounded-full bg-border" />
              <span className="size-2.5 rounded-full bg-border" />
              <span className="chip chip-n ml-2 !h-[22px]">Sample interview</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="eyebrow">AI interviewer · Question 3 of 8</span>
              <span className="chip chip-n">
                <Icon name="clock" size={12} />
                12:40
              </span>
            </div>
            <p className="font-display text-xl leading-snug font-semibold">
              How would you design the REST API for the task manager project on your resume?
            </p>
            <div className="rounded-[10px] border border-border p-3 text-[13px] leading-normal text-muted">
              I&apos;d start with resources for tasks and users, then map CRUD to HTTP methods…
            </div>
            <div className="flex items-center justify-between">
              <span className="chip">
                <Icon name="mic" size={12} />
                Voice or text
              </span>
              <span className="btn btn-sm" aria-hidden="true">
                Submit
              </span>
            </div>
          </div>

          <div className="absolute top-0 right-0 flex w-[250px] flex-col gap-2 rounded-[14px] bg-primary-600 px-[18px] py-4 shadow-[0_24px_48px_rgba(0,0,0,0.35)]">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.1em] text-primary-200 uppercase">
              <Icon name="message" size={12} />
              AI follow-up
            </span>
            <p className="text-sm leading-snug font-semibold text-white">
              Which status codes would you return for validation errors?
            </p>
          </div>

          <div className="card absolute right-[30px] bottom-0 flex w-[270px] items-center gap-3.5 !border-0 !p-[18px] text-text shadow-[0_24px_48px_rgba(0,0,0,0.35)]">
            <ScoreRing score={78} size={84} stroke={9} />
            <div>
              <div className="text-sm font-bold">Answer score</div>
              <div className="mt-0.5 text-xs leading-snug text-muted">
                Explain status codes more clearly.
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
