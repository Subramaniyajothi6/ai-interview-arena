"use client";

import { useActionState } from "react";
import { Field, FormAlert, SubmitButton } from "@/components/ui/form";
import { EXPERIENCE_LEVELS, JOB_ROLES } from "@/lib/constants";
import { updateProfile, type ProfileFormState } from "./actions";

type Values = {
  fullName: string;
  email: string;
  phone: string;
  education: string;
  experienceLevel: string;
  experienceSummary: string;
  preferredRole: string;
};

export function ProfileForm({ values }: { values: Values }) {
  const [state, action] = useActionState<ProfileFormState, FormData>(updateProfile, {});
  const err = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {state.error && <FormAlert tone="error">{state.error}</FormAlert>}
      {state.success && <FormAlert tone="success">{state.success}</FormAlert>}

      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
        <Field
          id="fullName"
          label="Full name"
          autoComplete="name"
          defaultValue={values.fullName}
          error={err.fullName}
        />
        <Field
          id="email"
          label="Email"
          type="email"
          defaultValue={values.email}
          readOnly
          hint="Your login email can't be changed here."
          className="input bg-bg text-muted"
        />
        <Field
          id="phone"
          label="Phone"
          type="tel"
          autoComplete="tel"
          placeholder="+91 98765 43210"
          defaultValue={values.phone}
          error={err.phone}
        />
        <div>
          <label className="label" htmlFor="preferredRole">
            Preferred job role
          </label>
          <select
            id="preferredRole"
            name="preferredRole"
            className="input"
            defaultValue={values.preferredRole}
          >
            <option value="">Select a role</option>
            {JOB_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <Field
          id="education"
          label="Education"
          placeholder="e.g. B.E. Computer Science, Anna University (2025)"
          defaultValue={values.education}
          error={err.education}
        />
        <div>
          <label className="label" htmlFor="experienceLevel">
            Experience level
          </label>
          <select
            id="experienceLevel"
            name="experienceLevel"
            className="input"
            defaultValue={values.experienceLevel}
          >
            <option value="">Select your experience</option>
            {EXPERIENCE_LEVELS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="experienceSummary">
          Experience
        </label>
        <textarea
          id="experienceSummary"
          name="experienceSummary"
          rows={3}
          className="input"
          placeholder="e.g. Full-stack intern at Acme, 6 months — built the admin dashboard in React."
          defaultValue={values.experienceSummary}
          aria-invalid={err.experienceSummary ? true : undefined}
        />
        {err.experienceSummary && (
          <p className="mt-1.5 text-xs text-danger">{err.experienceSummary}</p>
        )}
      </div>

      <div className="flex justify-end">
        <SubmitButton pendingText="Saving…" className="btn">
          Save changes
        </SubmitButton>
      </div>
    </form>
  );
}
