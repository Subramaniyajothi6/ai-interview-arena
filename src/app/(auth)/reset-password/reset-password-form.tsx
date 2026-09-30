"use client";

import { useActionState } from "react";
import { Field, FormAlert, SubmitButton } from "@/components/ui/form";
import { resetPassword, type AuthFormState } from "../actions";

// Reached from the emailed reset link (via /auth/callback, which signs the user in).
export function ResetPasswordForm() {
  const [state, action] = useActionState<AuthFormState, FormData>(resetPassword, {});

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <div>
        <h1 className="text-[30px]">Set a new password</h1>
        <p className="mt-1.5 text-sm text-muted">
          Choose a password you haven&apos;t used here before.
        </p>
      </div>

      {state.error && <FormAlert tone="error">{state.error}</FormAlert>}

      <Field
        id="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        placeholder="8+ characters"
        error={state.fieldErrors?.password}
        required
      />
      <Field
        id="confirmPassword"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        placeholder="Re-enter"
        error={state.fieldErrors?.confirmPassword}
        required
      />

      <SubmitButton pendingText="Saving…">Update password</SubmitButton>
    </form>
  );
}
