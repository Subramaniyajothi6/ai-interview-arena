"use client";

import { useActionState, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { addSkill, removeSkill, type SkillFormState } from "./actions";
import { useEditMode } from "./edit-mode";

export function SkillsEditor({ skills }: { skills: { id: number; name: string }[] }) {
  const { editing } = useEditMode();
  const [adding, setAdding] = useState(false);
  // The input stays open (and React clears it) so several skills can be added in a row.
  const [state, action, pending] = useActionState<SkillFormState, FormData>(addSkill, {});

  return (
    <div className="flex flex-col gap-2">
      <span className="label !mb-0">Skills</span>
      <div className="flex flex-wrap items-center gap-2 rounded-control border border-border p-2.5">
        {skills.length === 0 && !(editing && adding) && (
          <span className="px-1 text-[13px] text-muted">
            No skills yet. Add some, or upload a resume.
          </span>
        )}
        {skills.map((s) => (
          <span key={s.id} className="chip">
            {s.name}
            {editing && (
              <form action={removeSkill} className="flex">
                <input type="hidden" name="skillId" value={s.id} />
                <button
                  type="submit"
                  aria-label={`Remove ${s.name}`}
                  className="flex cursor-pointer border-0 bg-transparent p-0 text-primary-900"
                >
                  <Icon name="x" size={12} strokeWidth={2.5} />
                </button>
              </form>
            )}
          </span>
        ))}
        {!editing ? null : adding ? (
          <form action={action} className="flex items-center gap-1.5">
            <label htmlFor="new-skill" className="sr-only">
              Add a skill
            </label>
            <input
              id="new-skill"
              name="skill"
              autoFocus
              className="input !h-8 !w-40 !px-2.5 !text-[13px]"
              placeholder="e.g. TypeScript"
              aria-invalid={state.error ? true : undefined}
              aria-describedby={state.error ? "skill-error" : undefined}
              onKeyDown={(e) => {
                if (e.key === "Escape") setAdding(false);
              }}
            />
            <button type="submit" className="btn btn-sm !h-8 !px-3" disabled={pending}>
              {pending ? "Adding…" : "Add"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm !h-8 !px-2"
              onClick={() => setAdding(false)}
              aria-label="Stop adding skills"
            >
              <Icon name="x" size={14} />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="h-7 cursor-pointer rounded-full border-0 bg-transparent px-2.5 text-[13px] font-semibold text-primary-900 hover:bg-primary-50"
          >
            + Add skill
          </button>
        )}
      </div>
      {state.error && (
        <p id="skill-error" className="text-xs text-danger">
          {state.error}
        </p>
      )}
    </div>
  );
}
