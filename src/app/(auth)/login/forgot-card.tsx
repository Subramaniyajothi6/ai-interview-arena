"use client";

import { useActionState } from "react";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { forgotPassword, type AuthFormState } from "../actions";

// Reset-password card that opens beside the login form on wide screens when
// "Forgot password?" is clicked. Smaller screens use the /forgot-password page.
export function ForgotCard({ onClose }: { onClose: () => void }) {
  const [state, action] = useActionState<AuthFormState, FormData>(forgotPassword, {});

  return (
    <form
      action={action}
      noValidate
      aria-labelledby="forgot-title"
      className="card hidden w-[250px] shrink-0 flex-col gap-3 !p-[22px] shadow-[0_12px_32px_rgba(23,21,42,0.10)] xl:flex"
    >
      <div className="flex items-start justify-between">
        <span className="flex size-10 items-center justify-center rounded-[11px] bg-primary-50 text-primary-600">
          <Icon name="lock" size={20} />
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close reset password"
          className="btn btn-ghost btn-sm !w-8 !px-0 !text-muted"
        >
          <Icon name="x" size={16} />
        </button>
      </div>
      <h2 id="forgot-title" className="text-base">
        Reset password
      </h2>
      <p className="text-[13px] leading-normal text-muted">
        We&apos;ll email you a link to set a new password.
      </p>
      {state.success && <FormAlert tone="success">{state.success}</FormAlert>}
      {state.error && <FormAlert tone="error">{state.error}</FormAlert>}
      <div>
        <label className="label" htmlFor="forgot-email">
          Email
        </label>
        <input
          id="forgot-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          autoFocus
          className="input"
          defaultValue={state.values?.email}
          aria-invalid={state.fieldErrors?.email ? true : undefined}
          aria-describedby={state.fieldErrors?.email ? "forgot-email-error" : undefined}
        />
        {state.fieldErrors?.email && (
          <p id="forgot-email-error" className="mt-1.5 text-xs text-danger">
            {state.fieldErrors.email}
          </p>
        )}
      </div>
      <SubmitButton pendingText="Sending…" className="btn btn-sec w-full">
        Send reset link
      </SubmitButton>
    </form>
  );
}
