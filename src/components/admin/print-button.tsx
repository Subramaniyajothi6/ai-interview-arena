"use client";

import { Icon } from "@/components/ui/icon";

// Uses the browser's print dialog, which also offers "Save as PDF".
export function PrintButton({
  label = "Print / Save PDF",
  className = "btn btn-sec btn-sm",
  ariaLabel,
}: {
  label?: string;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      className={`${className} print:hidden`}
      aria-label={ariaLabel}
      onClick={() => window.print()}
    >
      <Icon name="download" size={16} />
      {label}
    </button>
  );
}
