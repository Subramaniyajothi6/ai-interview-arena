import { Fragment } from "react";
import { Icon } from "./icon";

export const INTERVIEW_STEPS = [
  "Interview setup",
  "Resume",
  "Job description",
  "Instructions",
  "Interview",
] as const;

// Progress through the new-interview flow. `current` is 0-based.
export function Stepper({
  steps = INTERVIEW_STEPS,
  current,
}: {
  steps?: readonly string[];
  current: number;
}) {
  return (
    <ol className="flex items-center gap-4" aria-label="Progress">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <Fragment key={step}>
            {i > 0 && (
              <li
                aria-hidden="true"
                className={`h-0.5 grow rounded-sm ${i <= current ? "bg-primary-600" : "bg-border"}`}
              />
            )}
            <li className="flex items-center gap-2.5" aria-current={active ? "step" : undefined}>
              <span
                className={`flex size-[30px] items-center justify-center rounded-full text-[13px] font-bold ${
                  done
                    ? "bg-primary-600 text-white"
                    : active
                      ? "bg-primary-600 text-white shadow-[0_0_0_4px_var(--color-primary-100)]"
                      : "border-[1.5px] border-border-strong text-muted"
                }`}
              >
                {done ? <Icon name="check" size={15} strokeWidth={2.5} /> : i + 1}
              </span>
              <span
                // Five labels only fit side by side on wide screens; the current
                // step is always named.
                className={`text-sm ${active ? "max-sm:hidden" : "hidden xl:inline"} ${active ? "font-semibold text-text" : done ? "font-medium text-text" : "font-medium text-muted"}`}
              >
                {step}
              </span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
