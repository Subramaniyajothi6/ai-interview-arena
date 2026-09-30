"use client";

import { Icon } from "@/components/ui/icon";

// Uses the browser's print dialog, which also offers "Save as PDF".
export function PrintButton({ label = "Print / Save PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      className="btn btn-sec btn-sm print:hidden"
      onClick={() => window.print()}
    >
      <Icon name="download" size={16} />
      {label}
    </button>
  );
}
