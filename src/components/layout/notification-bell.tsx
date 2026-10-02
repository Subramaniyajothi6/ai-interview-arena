"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { Notification } from "@/lib/data/notifications";

const SEEN_KEY = "aia-notifications-seen";
const timeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function readSeen() {
  try {
    return localStorage.getItem(SEEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function NotificationBell({ items }: { items: Notification[] }) {
  const [open, setOpen] = useState(false);
  // Newest item time the user has already seen (kept in this browser).
  const [seen, setSeen] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // localStorage is only available after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeen(readSeen());
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const newest = items[0]?.at ?? "";
  const unread = seen !== null && newest > seen;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && newest) {
      setSeen(newest);
      try {
        localStorage.setItem(SEEN_KEY, newest);
      } catch {}
    }
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        className="btn btn-ghost relative w-11 !px-0 !text-text-2"
        aria-label={unread ? "Notifications (new)" : "Notifications"}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={toggle}
      >
        <Icon name="bell" />
        {unread && (
          <span className="absolute top-2.5 right-3 size-2 rounded-full bg-accent ring-2 ring-surface" />
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="card absolute right-0 z-30 mt-2 flex w-[min(320px,calc(100vw-32px))] flex-col !p-0 shadow-[0_12px_32px_rgba(23,21,42,0.12)]"
        >
          <h2 className="border-b border-border-soft px-4 py-3 text-sm">Notifications</h2>
          {items.length === 0 ? (
            <p className="px-4 py-5 text-[13px] text-muted">
              Nothing yet. Updates about your interviews and reports appear here.
            </p>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id} className="border-b border-border-soft last:border-0">
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="flex flex-col gap-0.5 px-4 py-3 text-[13px] text-text no-underline hover:bg-bg hover:text-text"
                  >
                    {n.text}
                    <span className="text-xs text-muted">{timeFmt.format(new Date(n.at))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
