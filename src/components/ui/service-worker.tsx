"use client";

import { useEffect } from "react";

// Registers /sw.js, which shows our offline page when a page load fails
// without a connection (instead of the browser's own error page).
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Not supported or blocked (e.g. private mode): the app works without it.
    });
  }, []);
  return null;
}
