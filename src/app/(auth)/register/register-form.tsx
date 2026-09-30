"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormAlert, SubmitButton } from "@/components/ui/form";
import { register, type AuthFormState } from "../actions";

export function RegisterForm() {
  const [state, action] = useActionState<AuthFormState, FormData>(register, {});

  if (state.success) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-[30px]">Check your email</h1>
        <FormAlert tone="success">{state.success}</FormAlert>
        <Link href="/login" className="btn btn-sec btn-lg w-full">
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <div>
        <h1 className="text-[30px]">Create your account</h1>
        <p className="mt-1.5 text-sm text-muted">Free to start. Takes under a minute.</p>
      </div>

      {state.error && <FormAlert tone="error">{state.error}</FormAlert>}

      <Field
        id="fullName"
        label="Full name"
        autoComplete="name"
        placeholder="e.g. Priya Raman"
        defaultValue={state.values?.fullName}
        error={state.fieldErrors?.fullName}
        required
      />
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
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="8+ characters"
          error={state.fieldErrors?.password}
          required
        />
        <Field
          id="confirmPassword"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter"
          error={state.fieldErrors?.confirmPassword}
          required
        />
      </div>

      <div>
        <label className="flex items-start gap-2.5 text-[13px] leading-snug text-muted">
          <input
            type="checkbox"
            name="terms"
            className="mt-px size-[18px] shrink-0 accent-primary-600"
            aria-invalid={state.fieldErrors?.terms ? true : undefined}
            aria-describedby={state.fieldErrors?.terms ? "terms-error" : undefined}
          />
          I agree to the Terms and Privacy Policy.
        </label>
        {state.fieldErrors?.terms && (
          <p id="terms-error" className="mt-1.5 text-xs text-danger">
            {state.fieldErrors.terms}
          </p>
        )}
      </div>

      <SubmitButton pendingText="Creating account…">Create account</SubmitButton>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold">
          Log in
        </Link>
      </p>
    </form>
  );
}
