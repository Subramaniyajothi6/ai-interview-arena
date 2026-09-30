"use client";

import { useActionState } from "react";
import { adminLogin, type AuthFormState } from "@/app/(auth)/actions";
import { Field, FormAlert, SubmitButton } from "@/components/ui/form";
import { Logo } from "@/components/ui/logo";

export function AdminLoginForm({ notice }: { notice?: string }) {
  const [state, action] = useActionState<AuthFormState, FormData>(adminLogin, {});

  return (
    <form
      action={action}
      noValidate
      className="card flex w-full max-w-[420px] flex-col gap-[18px] !border-0 !p-10 shadow-[0_24px_48px_rgba(0,0,0,0.35)]"
    >
      <div className="flex items-center justify-between">
        <Logo />
        <span className="chip">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
          </svg>
          Admin
        </span>
      </div>
      <div>
        <h1 className="text-[28px]">Admin sign in</h1>
        <p className="mt-1.5 text-sm text-muted">Restricted to platform administrators.</p>
      </div>

      {state.error ? (
        <FormAlert tone="error">{state.error}</FormAlert>
      ) : notice ? (
        <FormAlert tone="error">{notice}</FormAlert>
      ) : null}

      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="username"
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <Field
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        error={state.fieldErrors?.password}
      />
      <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
      <p className="flex justify-center gap-1.5 text-center text-xs text-muted">
        <svg
          width="14"
          height="14"
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
        Access is role-restricted.
      </p>
    </form>
  );
}
