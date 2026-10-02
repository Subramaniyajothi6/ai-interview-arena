import { OfflineHint } from "./offline-hint";

// Placeholder shown while a page's data loads (used by loading.tsx files).
export function PageLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-[1120px] flex-col gap-5"
      aria-busy="true"
      aria-label="Loading"
    >
      <OfflineHint />
      <div className="h-8 w-64 animate-pulse rounded-control bg-border-soft" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-card bg-border-soft" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-card bg-border-soft" />
    </div>
  );
}
