"use client";

import { useActionState, useRef } from "react";
import { addSkill, removeSkill, type SkillFormState } from "./actions";

export function SkillsEditor({ skills }: { skills: { id: number; name: string }[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<SkillFormState, FormData>(
    async (prev, formData) => {
      const result = await addSkill(prev, formData);
      if (!result.error) formRef.current?.reset();
      return result;
    },
    {},
  );

  return (
    <div className="flex flex-col gap-2">
      <span className="label !mb-0">Skills</span>
      <div className="flex flex-wrap items-center gap-2 rounded-control border border-border p-2.5">
        {skills.length === 0 && (
          <span className="px-1 text-[13px] text-muted">
            No skills yet. Add some, or upload a resume.
          </span>
        )}
        {skills.map((s) => (
          <span key={s.id} className="chip">
            {s.name}
            <form action={removeSkill} className="flex">
              <input type="hidden" name="skillId" value={s.id} />
              <button
                type="submit"
                aria-label={`Remove ${s.name}`}
                className="flex cursor-pointer border-0 bg-transparent p-0 text-primary-900"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </form>
          </span>
        ))}
      </div>
      <form ref={formRef} action={action} className="flex gap-2">
        <label htmlFor="new-skill" className="sr-only">
          Add a skill
        </label>
        <input
          id="new-skill"
          name="skill"
          className="input !h-9 max-w-60"
          placeholder="e.g. TypeScript"
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "skill-error" : undefined}
        />
        <button type="submit" className="btn btn-sec btn-sm" disabled={pending}>
          {pending ? "Adding…" : "+ Add skill"}
        </button>
      </form>
      {state.error && (
        <p id="skill-error" className="text-xs text-danger">
          {state.error}
        </p>
      )}
    </div>
  );
}
