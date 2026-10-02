"use client";

import Link from "next/link";
import { useOffline } from "next/offline";
import { useEffect } from "react";
import { Icon } from "./icon";

// Shared UI for route error boundaries: a calm message, a retry button and a
// way home. When the browser is offline it says so (the usual cause of a
// failed request). Technical details are never shown to users; only the
// digest, which matches the server log entry.
export function ErrorState({
  error,
  retry,
  homeHref = "/dashboard",
}: {
  error: Error & { digest?: string };
  retry: () => void;
  homeHref?: string;
}) {
  const offline = useOffline();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex grow items-center justify-center px-4 py-16">
      <section
        role="alert"
        className="card flex max-w-md flex-col items-center gap-4 !p-8 text-center"
      >
        <span
          className={`flex size-14 items-center justify-center rounded-full ${
            offline ? "bg-warning-bg text-warning" : "bg-danger-bg text-danger"
          }`}
        >
          <Icon name="alert" size={26} />
        </span>
        <div>
          <h1 className="text-xl">{offline ? "No internet connection" : "Something went wrong"}</h1>
          <p className="mt-1.5 text-sm text-muted">
            {offline
              ? "You're offline, so this page couldn't load. Reconnect and press Try again."
              : "We couldn't load this page. Your data is safe. Please try again in a moment."}
          </p>
          {error.digest && (
            <p className="mt-2 font-mono text-xs text-muted">Reference: {error.digest}</p>
          )}
        </div>
        <div className="flex gap-3">
          <button type="button" className="btn" onClick={() => retry()}>
            <Icon name="refresh" size={16} />
            Try again
          </button>
          <Link href={homeHref} className="btn btn-sec">
            Go home
          </Link>
        </div>
      </section>
    </div>
  );
}
