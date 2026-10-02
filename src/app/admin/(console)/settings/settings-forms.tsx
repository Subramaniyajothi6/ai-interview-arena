"use client";

import { useActionState, useState } from "react";
import { Field, FormAlert, SubmitButton } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { addAdmin, saveSettings, type AdminFormState } from "../actions";

const FORM_ID = "settings-form";

export type Settings = {
  questionsPerInterview: number;
  maxFollowUps: number;
  maxResumeMb: number;
  allowFollowUps: boolean;
  allowVoice: boolean;
  showQuestionScores: boolean;
  aiProvider: string;
};

function Switch({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-4 py-2 text-sm">
      {label}
      <input
        type="checkbox"
        role="switch"
        name={name}
        form={FORM_ID}
        defaultChecked={defaultChecked}
        className="switch"
      />
    </label>
  );
}

// The three settings cards share one form (via the `form` attribute) so the
// admin accounts card can sit in the same grid with its own forms.
export function SettingsCards({
  settings: saved,
  adminCard,
  aiStatus,
}: {
  settings: Settings;
  adminCard: React.ReactNode;
  // Model label per provider, or null when that provider has no API key.
  aiStatus: Record<"openai" | "open_source", string | null>;
}) {
  const [state, action] = useActionState<AdminFormState, FormData>(saveSettings, {});
  const err = state.fieldErrors ?? {};
  // After a failed save, keep what the admin entered instead of the saved values.
  const sent = state.values;
  const settings = sent
    ? {
        questionsPerInterview: sent.questionsPerInterview ?? "",
        maxFollowUps: sent.maxFollowUps ?? "",
        maxResumeMb: sent.maxResumeMb ?? "",
        allowFollowUps: sent.allowFollowUps === "on",
        allowVoice: sent.allowVoice === "on",
        showQuestionScores: sent.showQuestionScores === "on",
        aiProvider: sent.aiProvider ?? saved.aiProvider,
      }
    : saved;

  return (
    // A new key after a failed save remounts the fields with what was entered
    // (React 19 resets forms after an action, and selects reset to their first defaults).
    <div key={sent ? JSON.stringify(sent) : "saved"} className="flex flex-col gap-5">
      <form id={FORM_ID} action={action} noValidate />
      {state.error && <FormAlert tone="error">{state.error}</FormAlert>}
      {state.success && <FormAlert tone="success">{state.success}</FormAlert>}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card flex flex-col gap-1 !p-6">
          <h2 className="pb-3 text-base">Interview defaults</h2>
          <Field
            id="questionsPerInterview"
            form={FORM_ID}
            label="Questions per interview"
            type="number"
            min={3}
            max={15}
            defaultValue={settings.questionsPerInterview}
            hint="Follow-ups are added on top of this number."
            error={err.questionsPerInterview}
          />
          <div className="pt-2">
            <Switch
              name="allowFollowUps"
              label="Allow AI follow-up questions"
              defaultChecked={settings.allowFollowUps}
            />
            <Switch
              name="allowVoice"
              label="Allow voice answers"
              defaultChecked={settings.allowVoice}
            />
            <Switch
              name="showQuestionScores"
              label="Show per-question scores to candidates"
              defaultChecked={settings.showQuestionScores}
            />
          </div>
          <label className="mt-1 flex items-center justify-between gap-4 text-sm">
            Max follow-ups per question
            <input
              name="maxFollowUps"
              form={FORM_ID}
              type="number"
              min={0}
              max={3}
              defaultValue={settings.maxFollowUps}
              className="input !h-9 !w-20"
              aria-invalid={err.maxFollowUps ? true : undefined}
            />
          </label>
        </section>

        <section className="card flex flex-col gap-4 !p-6">
          <h2 className="text-base">AI service</h2>
          <div>
            <label className="label" htmlFor="aiProvider">
              Provider
            </label>
            <select
              id="aiProvider"
              name="aiProvider"
              form={FORM_ID}
              className="input"
              defaultValue={settings.aiProvider}
            >
              <option value="openai">OpenAI API</option>
              <option value="open_source">Open-source AI model</option>
            </select>
          </div>
          <p className="flex gap-2.5 rounded-control bg-primary-50 px-3.5 py-3 text-[13px] text-primary-900">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="mt-0.5 shrink-0"
            >
              <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
            </svg>
            Only the data needed for each request is sent to the AI service.
          </p>
          <ul className="flex flex-col gap-1.5 text-[13px]">
            {(
              [
                ["open_source", "Open-source AI model", "OPEN_SOURCE_AI_API_KEY"],
                ["openai", "OpenAI API", "OPENAI_API_KEY"],
              ] as const
            ).map(([key, name, env]) => (
              <li key={key} className="flex flex-wrap items-center gap-2">
                <span className={`chip ${aiStatus[key] ? "chip-ok" : "chip-n"}`}>
                  {aiStatus[key] ? "Connected" : "No key"}
                </span>
                <span className="font-semibold">{name}</span>
                <span className="text-muted">
                  {aiStatus[key] ?? `set ${env} on the server to enable`}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">
            Without a connected provider the app uses keyword resume analysis and the question bank,
            and reports show &ldquo;Evaluation pending&rdquo;.
          </p>
        </section>

        <section className="card flex flex-col gap-4 !p-6">
          <h2 className="text-base">Resume uploads</h2>
          <div>
            <span className="label">Allowed file types</span>
            <div className="flex gap-2">
              {["PDF", "DOC", "DOCX"].map((t) => (
                <span key={t} className="chip">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <Field
            id="maxResumeMb"
            form={FORM_ID}
            label="Max file size (MB)"
            type="number"
            min={1}
            max={5}
            defaultValue={settings.maxResumeMb}
            hint="Up to 5 MB."
            error={err.maxResumeMb}
          />
        </section>

        {adminCard}
      </div>

      <div className="flex justify-end gap-3">
        <button type="reset" form={FORM_ID} className="btn btn-sec">
          Discard
        </button>
        {/* Linked to the settings form with the `form` attribute. */}
        <button type="submit" form={FORM_ID} className="btn">
          Save settings
        </button>
      </div>
    </div>
  );
}

export function InviteAdmin() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<AdminFormState, FormData>(addAdmin, {});
  return (
    <div className="flex flex-col gap-3">
      {!open ? (
        <button
          type="button"
          className="btn btn-sec btn-sm self-start"
          onClick={() => setOpen(true)}
        >
          <Icon name="plusCircle" size={16} />
          Invite admin
        </button>
      ) : (
        <form action={action} noValidate className="flex flex-col gap-2">
          <div className="flex flex-wrap items-end gap-2.5">
            <div className="min-w-56 grow">
              <Field
                id="email"
                label="Email of an existing account"
                type="email"
                placeholder="name@example.com"
                error={state.fieldErrors?.email}
              />
            </div>
            <SubmitButton pendingText="Adding…" className="btn btn-sm">
              Add admin
            </SubmitButton>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
          {state.success && <p className="text-[13px] text-success">{state.success}</p>}
        </form>
      )}
    </div>
  );
}
