"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormAlert, SubmitButton } from "@/components/ui/form";
import { login, type AuthFormState } from "../actions";

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action] = useActionState<AuthFormState, FormData>(login, {});

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <div>
        <h1 className="text-[30px]">Welcome back</h1>
        <p className="mt-1.5 text-sm text-muted">Log in to continue your practice.</p>
      </div>

      {state.error ? (
        <FormAlert tone="error">{state.error}</FormAlert>
      ) : notice ? (
        <FormAlert tone="error">{notice}</FormAlert>
      ) : null}

      {next && <input type="hidden" name="next" value={next} />}
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
      <Field
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        placeholder="Your password"
        error={state.fieldErrors?.password}
        required
      />
      <div className="flex justify-end text-[13px]">
        <Link href="/forgot-password" className="font-semibold">
          Forgot password?
        </Link>
      </div>

      <SubmitButton pendingText="Logging in…">Log in</SubmitButton>

      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link href="/register" className="font-semibold">
          Create an account
        </Link>
      </p>
    </form>
  );
}
