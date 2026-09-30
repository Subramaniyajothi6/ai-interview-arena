"use client";

import { useRouter, usePathname } from "next/navigation";
import { useRef } from "react";

// Filter bar that applies as soon as a select changes, and on Enter in the
// search box, like the design (no separate Apply button). Works without JS
// as a normal GET form.
export function AutoFilterForm({
  children,
  label,
  className = "flex flex-wrap items-center gap-3",
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLFormElement>(null);

  function apply() {
    const form = ref.current;
    if (!form) return;
    const params = new URLSearchParams();
    for (const [k, v] of new FormData(form)) if (typeof v === "string" && v) params.set(k, v);
    router.push(params.size ? `${pathname}?${params}` : pathname);
  }

  return (
    <form
      ref={ref}
      aria-label={label}
      className={className}
      onChange={(e) => {
        if ((e.target as HTMLElement).tagName === "SELECT") apply();
      }}
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      {children}
    </form>
  );
}
