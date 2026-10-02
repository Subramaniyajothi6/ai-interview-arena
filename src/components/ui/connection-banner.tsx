"use client";

import { useOffline } from "next/offline";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";

// "No internet" notice for every page. Shows while the app is offline (the
// browser reports it, or a request couldn't reach the server) and briefly
// confirms when the connection comes back. Pending clicks and saves are
// retried automatically once online.
export function ConnectionBanner() {
  const offline = useOffline();
  const [wasOffline, setWasOffline] = useState(false);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    if (offline) {
      // Remember the outage so we can confirm when it ends.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWasOffline(true);
      setShowBack(false);
      return;
    }
    if (!wasOffline) return;
    setShowBack(true);
    const t = setTimeout(() => setShowBack(false), 3000);
    return () => clearTimeout(t);
  }, [offline, wasOffline]);

  if (!offline && !showBack) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 px-4 py-2.5 text-center text-[13px] font-semibold print:hidden ${
        offline ? "bg-ink text-white" : "bg-success text-white"
      }`}
    >
      <Icon name={offline ? "alert" : "check"} size={16} />
      {offline
        ? "You're offline. We'll continue automatically when your connection is back — nothing you typed is lost."
        : "You're back online."}
    </div>
  );
}
