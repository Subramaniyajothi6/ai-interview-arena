"use client";

import { useActionState, useState } from "react";
import { Field, FormAlert } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { JOB_ROLES } from "@/lib/constants";
import { updateProfile, type ProfileFormState } from "./actions";
import { useEditMode } from "./edit-mode";

type Values = {
  fullName: string;
  email: string;
  phone: string;
  education: string;
  experienceSummary: string;
  preferredRole: string;
};

// `children` (the skills editor has its own forms, which can't be nested) is
// shown between the fields and the buttons, as in the design. Fields are
// read-only until "Edit profile" is clicked.
export function ProfileForm({
  values: saved,
  children,
}: {
  values: Values;
  children?: React.ReactNode;
}) {
  const { editing, setEditing } = useEditMode();
  // Bumped by Cancel to remount the form with the saved values.
  const [formKey, setFormKey] = useState(0);
  const [discarded, setDiscarded] = useState<ProfileFormState | null>(null);
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(
    async (prev, formData) => {
      const result = await updateProfile(prev, formData);
      if (result.success) setEditing(false);
      return result;
    },
    {},
  );
  const live = state === discarded ? {} : state;
  const err = live.fieldErrors ?? {};
  // After a failed save, keep what was typed rather than the saved values.
  const sent = live.values;
  const values: Values = sent
    ? {
        ...saved,
        fullName: sent.fullName ?? "",
        phone: sent.phone ?? "",
        education: sent.education ?? "",
        experienceSummary: sent.experienceSummary ?? "",
        preferredRole: sent.preferredRole ?? "",
      }
    : saved;

  function cancel() {
    setDiscarded(state); // drop errors and typed values
    setFormKey((k) => k + 1); // back to the saved values
    setEditing(false);
  }

  return (
    <>
      <form
        // Remount after Cancel, and after a failed save so every field (selects
        // included) shows what was typed — React 19 resets forms after an action.
        key={`${formKey}-${sent ? JSON.stringify(sent) : "saved"}`}
        id="profile-form"
        action={action}
        noValidate
        className="flex flex-col gap-4"
      >
        {live.error && <FormAlert tone="error">{live.error}</FormAlert>}
        {live.success && <FormAlert tone="success">{live.success}</FormAlert>}

        <fieldset
          disabled={!editing || pending}
          className="grid min-w-0 gap-x-5 gap-y-4 sm:grid-cols-2"
        >
          <legend className="sr-only">
            {editing ? "Edit your details" : "Your details (read-only)"}
          </legend>
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
          <Field
            id="experienceSummary"
            label="Experience"
            placeholder="e.g. Full-stack intern, 6 months"
            defaultValue={values.experienceSummary}
            error={err.experienceSummary}
          />
        </fieldset>
      </form>
      {children}
      <div className="mt-auto flex justify-end gap-2.5">
        {editing ? (
          <>
            <button type="button" className="btn btn-sec" onClick={cancel} disabled={pending}>
              Cancel
            </button>
            <button type="submit" form="profile-form" className="btn" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </button>
          </>
        ) : (
          <button type="button" className="btn" onClick={() => setEditing(true)}>
            <Icon name="pencil" size={16} />
            Edit profile
          </button>
        )}
      </div>
    </>
  );
}
