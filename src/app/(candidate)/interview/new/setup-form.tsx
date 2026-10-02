"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { Icon, type IconName } from "@/components/ui/icon";
import {
  DIFFICULTIES,
  EXPERIENCE_LEVELS,
  INTERVIEW_TYPES,
  JOB_ROLES,
  labelFor,
} from "@/lib/constants";
import { createInterview, type SetupFormState } from "../actions";

type Option = { value: string; label: string };

// Icons on the interview-type options, as in the setup board.
const TYPE_ICONS: Record<string, IconName> = {
  technical: "code",
  hr: "users",
  behavioral: "message",
  managerial: "flag",
  mixed: "shuffle",
};

function OptionGroup({
  name,
  legend,
  options,
  value,
  onChange,
  error,
  icons,
}: {
  name: string;
  legend: string;
  options: readonly Option[];
  value: string;
  onChange: (v: string) => void;
  error?: string;
  icons?: Record<string, IconName>;
}) {
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
        {options.map((o) => (
          <label key={o.value} className="opt justify-center !px-2 text-center whitespace-nowrap">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {icons?.[o.value] && <Icon name={icons[o.value]} size={16} />}
            {o.label}
          </label>
        ))}
      </div>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </fieldset>
  );
}

export function SetupForm({
  defaults,
  questionCount,
}: {
  defaults: { jobRole: string; experienceLevel: string; interviewType: string; difficulty: string };
  questionCount: number;
}) {
  const [state, action] = useActionState<SetupFormState, FormData>(createInterview, {});
  const [v, setV] = useState(defaults);
  const set = (key: keyof typeof v) => (value: string) => setV((s) => ({ ...s, [key]: value }));
  const err = state.fieldErrors ?? {};
  const minutes = Math.round(questionCount * 3.25);

  return (
    <form action={action} noValidate className="flex flex-col gap-5 lg:flex-row">
      <section className="card flex grow flex-col gap-[18px] !px-7 !py-[26px]">
        <div>
          <h2 className="text-xl">Configure your interview</h2>
          <p className="mt-1 text-[13px] text-muted">
            Questions are tailored to these choices and your resume.
          </p>
        </div>

        {state.error && <FormAlert tone="error">{state.error}</FormAlert>}

        <div>
          <label className="label" htmlFor="jobRole">
            Job role
          </label>
          <select
            id="jobRole"
            name="jobRole"
            className="input"
            value={v.jobRole}
            onChange={(e) => set("jobRole")(e.target.value)}
            aria-invalid={err.jobRole ? true : undefined}
          >
            {JOB_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {err.jobRole && <p className="mt-1.5 text-xs text-danger">{err.jobRole}</p>}
        </div>

        <OptionGroup
          name="experienceLevel"
          legend="Experience level"
          options={EXPERIENCE_LEVELS}
          value={v.experienceLevel}
          onChange={set("experienceLevel")}
          error={err.experienceLevel}
        />
        <OptionGroup
          name="interviewType"
          legend="Interview type"
          options={INTERVIEW_TYPES}
          icons={TYPE_ICONS}
          value={v.interviewType}
          onChange={set("interviewType")}
          error={err.interviewType}
        />
        <OptionGroup
          name="difficulty"
          legend="Difficulty"
          options={DIFFICULTIES}
          value={v.difficulty}
          onChange={set("difficulty")}
          error={err.difficulty}
        />

        <div className="mt-auto flex justify-between gap-3 pt-2">
          <Link href="/dashboard" className="btn btn-sec">
            Cancel
          </Link>
          <SubmitButton pendingText="Saving…" className="btn">
            Continue
            <Icon name="arrowRight" size={16} />
          </SubmitButton>
        </div>
      </section>

      <aside className="flex shrink-0 flex-col gap-4 lg:w-[300px]">
        <section className="card flex flex-col gap-3.5" aria-live="polite">
          <h3 className="text-base">Summary</h3>
          {[
            ["Role", v.jobRole],
            ["Experience", labelFor(EXPERIENCE_LEVELS, v.experienceLevel)],
            ["Type", labelFor(INTERVIEW_TYPES, v.interviewType)],
            ["Difficulty", labelFor(DIFFICULTIES, v.difficulty)],
            ["Questions", `${questionCount} + follow-ups`],
            ["Est. time", `${minutes}–${minutes + 5} min`],
          ].map(([k, val]) => (
            <div key={k} className="flex justify-between gap-3 text-sm">
              <span className="text-muted">{k}</span>
              <span className="text-right font-semibold">{val || "—"}</span>
            </div>
          ))}
        </section>
        <section className="card flex gap-3 !border-primary-200 !bg-primary-50 text-primary-900">
          <Icon name="sparkle" />
          <p className="text-[13px] leading-normal">
            Follow-up questions are added when an answer needs more depth.
          </p>
        </section>
      </aside>
    </form>
  );
}
