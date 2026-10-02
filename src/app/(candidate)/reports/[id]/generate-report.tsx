"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { isNetworkError, withNetworkErrors } from "@/lib/network";
import { generateReport } from "@/app/(candidate)/interview/actions";

// Builds the AI report for a finished interview (or rebuilds the plan).
export function GenerateReportButton({
  interviewId,
  label,
  className = "btn btn-sm",
}: {
  interviewId: string;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <span className="inline-flex flex-col items-start gap-1.5 print:hidden">
      <button
        type="button"
        className={className}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await withNetworkErrors(() => generateReport(interviewId));
            if (isNetworkError(result)) return setError(result.networkError);
            if (result.error) return setError(result.error);
            router.refresh();
          })
        }
      >
        <Icon name="refresh" size={16} className={pending ? "animate-spin" : undefined} />
        {pending ? "Preparing… (up to a minute)" : label}
      </button>
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
