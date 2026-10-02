"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { FormAlert } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { isNetworkError, withNetworkErrors } from "@/lib/network";
import { startInterview } from "../../actions";

export function StartPanel({ interviewId }: { interviewId: string }) {
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      {error && <FormAlert tone="error">{error}</FormAlert>}
      <label className="flex items-center gap-2.5 text-sm font-medium">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="size-[18px] accent-primary-600"
        />
        I&apos;ve read the instructions
      </label>
      <div className="flex justify-between gap-3">
        <Link href={`/interview/${interviewId}/resume`} className="btn btn-sec">
          <Icon name="arrowLeft" size={16} />
          Back
        </Link>
        <button
          type="button"
          className="btn btn-lg"
          disabled={!agreed || pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await withNetworkErrors(() => startInterview(interviewId));
              if (isNetworkError(result)) setError(result.networkError);
              else if (result?.error) setError(result.error);
            })
          }
        >
          {pending ? "Preparing questions…" : "Start interview"}
          {!pending && <Icon name="arrowRight" size={16} />}
        </button>
      </div>
    </div>
  );
}
