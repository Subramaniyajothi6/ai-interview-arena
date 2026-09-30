"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Icon } from "@/components/ui/icon";
import { Field, FormAlert, SubmitButton } from "@/components/ui/form";
import { forgotPassword, type AuthFormState } from "../actions";

export function ForgotPasswordForm() {
  const [state, action] = useActionState<AuthFormState, FormData>(forgotPassword, {});

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <span className="flex size-10 items-center justify-center rounded-[11px] bg-primary-50 text-primary-600">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
      </span>
      <div>
        <h1 className="text-[30px]">Reset password</h1>
        <p className="mt-1.5 text-sm text-muted">
          We&apos;ll email you a link to set a new password.
        </p>
      </div>

      {state.error && <FormAlert tone="error">{state.error}</FormAlert>}
      {state.success && <FormAlert tone="success">{state.success}</FormAlert>}

      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
        required
      />

      <SubmitButton pendingText="Sending…">Send reset link</SubmitButton>

      <Link href="/login" className="btn btn-ghost w-full">
        <Icon name="arrowLeft" size={16} />
        Back to log in
      </Link>
    </form>
  );
}
