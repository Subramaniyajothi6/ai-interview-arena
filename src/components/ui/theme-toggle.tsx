"use client";

import { useEffect, useState } from "react";
import { THEME_KEY } from "@/lib/theme";

// Light / dark switch. The theme follows the device until the user picks one;
// the choice is kept in this browser and applied before the page paints by
// THEME_SCRIPT (src/lib/theme.ts) in the root layout.

type Theme = "light" | "dark";

function currentTheme(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const Sun = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
const Moon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

// variant "switch": sliding switch for headers with room for it.
// variant "icon": bordered square button where space is tight.
// variant "responsive": icon on phones, switch from the sm breakpoint.
export function ThemeToggle({
  variant = "switch",
}: {
  variant?: "switch" | "icon" | "responsive";
}) {
  // null until mounted: the server can't know the device theme.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // Read once after mount, then keep in sync with the device setting.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setTheme(currentTheme());
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  function toggle() {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
    setTheme(next);
  }

  const dark = theme === "dark";
  const label = dark ? "Switch to light mode" : "Switch to dark mode";

  const icon = (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-control border border-border bg-surface text-muted hover:text-text"
    >
      {dark ? <Moon /> : <Sun />}
    </button>
  );

  const slider = (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      title={label}
      onClick={toggle}
      className={`relative h-[30px] w-[54px] shrink-0 cursor-pointer rounded-full border transition-colors ${
        dark ? "border-primary-600 bg-primary-600" : "border-border bg-border-soft"
      }`}
    >
      <span
        className={`absolute top-[2px] flex size-6 items-center justify-center rounded-full bg-surface text-primary-fg shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-[left] motion-reduce:transition-none ${
          dark ? "left-[26px]" : "left-[2px]"
        } [&_svg]:size-[13px]`}
      >
        {dark ? <Moon /> : <Sun />}
      </span>
    </button>
  );

  // Keep the space reserved before mount so the header doesn't shift.
  if (theme === null) {
    return (
      <span
        aria-hidden="true"
        className={
          variant === "icon"
            ? "size-9 shrink-0"
            : variant === "responsive"
              ? "size-9 shrink-0 sm:h-[30px] sm:w-[54px]"
              : "h-[30px] w-[54px] shrink-0"
        }
      />
    );
  }
  if (variant === "icon") return icon;
  if (variant === "switch") return slider;
  return (
    <>
      <span className="sm:hidden">{icon}</span>
      <span className="hidden sm:inline-flex">{slider}</span>
    </>
  );
}
