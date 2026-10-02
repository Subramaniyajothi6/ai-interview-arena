import { OfflineHint } from "@/components/ui/offline-hint";

// Shown while the interview room or completion page loads (no sidebar here).
export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col" aria-busy="true" aria-label="Loading interview">
      <div className="h-[72px] border-b border-border bg-surface" />
      <div className="mx-auto flex w-full max-w-[1280px] grow flex-col gap-5 px-4 py-6 sm:px-8 lg:flex-row">
        <div className="flex grow flex-col gap-4">
          <OfflineHint />
          <div className="h-32 animate-pulse rounded-card bg-border-soft" />
          <div className="h-80 animate-pulse rounded-card bg-border-soft" />
        </div>
        <div className="hidden h-96 w-[260px] animate-pulse rounded-card bg-border-soft lg:block" />
      </div>
    </div>
  );
}
