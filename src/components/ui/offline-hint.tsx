"use client";

import { useOffline } from "next/offline";
import { Icon } from "@/components/ui/icon";

// Shown inside loading screens while offline, so a waiting page explains itself.
export function OfflineHint() {
  const offline = useOffline();
  if (!offline) return null;
  return (
    <p
      role="status"
      className="flex items-center gap-2 rounded-control border border-warning-line bg-warning-bg px-4 py-3 text-[13px] font-semibold text-warning"
    >
      <Icon name="alert" size={16} />
      Waiting for your internet connection. This page will load as soon as you&apos;re back online.
    </p>
  );
}
