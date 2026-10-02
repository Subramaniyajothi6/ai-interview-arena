"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PlanQuestion } from "@/lib/plan";

const DIFFICULTY_CHIP: Record<string, string> = {
  easy: "chip-ok",
  medium: "chip-warn",
  hard: "chip-bad",
  expert: "chip-bad",
};
const label = (d: string) => d.charAt(0).toUpperCase() + d.slice(1);

// Practice questions with tick boxes; progress is kept in this browser.
export function PracticeQuestions({
  planId,
  questions,
}: {
  planId: string;
  questions: PlanQuestion[];
}) {
  const key = `aia-plan-done-${planId}`;
  const [done, setDone] = useState<number[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? "[]");
      // localStorage is only available after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Array.isArray(saved)) setDone(saved.filter((n) => typeof n === "number"));
    } catch {}
  }, [key]);

  function toggle(i: number) {
    const next = done.includes(i) ? done.filter((n) => n !== i) : [...done, i];
    setDone(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
  }

  return (
    <>
      <span className="-mt-[36px] self-end text-xs text-muted print:hidden" aria-live="polite">
        {done.length} of {questions.length} done
      </span>
      <ul className="mt-1">
        {questions.map((q, i) => {
          const checked = done.includes(i);
          return (
            <li
              key={q.question}
              className="flex items-center gap-3 border-b border-border-soft py-2.5 last:border-0"
            >
              <input
                id={`pq${i}`}
                type="checkbox"
                checked={checked}
                onChange={() => toggle(i)}
                className="size-4 shrink-0 accent-primary-600 print:hidden"
              />
              <label
                htmlFor={`pq${i}`}
                className={`grow cursor-pointer text-sm ${checked ? "text-muted line-through print:text-text print:no-underline" : ""}`}
              >
                {q.question}
              </label>
              {q.difficulty && (
                <span className={`chip shrink-0 ${DIFFICULTY_CHIP[q.difficulty] ?? "chip-n"}`}>
                  {label(q.difficulty)}
                </span>
              )}
              <Link
                href={`/interview/new${q.difficulty ? `?difficulty=${q.difficulty}` : ""}`}
                className="shrink-0 text-[13px] font-semibold print:hidden"
              >
                Practice
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
