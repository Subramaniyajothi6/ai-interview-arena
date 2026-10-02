"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormAlert, SubmitButton } from "@/components/ui/form";
import { login, type AuthFormState } from "../actions";

export function LoginForm({
  next,
  notice,
  onForgot,
}: {
  next?: string;
  notice?: string;
  onForgot?: () => void;
}) {
  const [state, action] = useActionState<AuthFormState, FormData>(login, {});

  return (
    <form action={action} noValidate className="flex w-full flex-col gap-4 xl:w-[380px]">
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
      <div className="flex items-center justify-between text-[13px]">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            name="remember"
            className="size-4 accent-primary-600"
            defaultChecked={state.values?.remember === "on"}
          />
          Remember me
        </label>
        <Link
          href="/forgot-password"
          className="font-semibold"
          onClick={(e) => {
            // Wide screens open the reset card beside the form; smaller
            // screens go to the reset page.
            if (onForgot && window.matchMedia("(min-width: 1280px)").matches) {
              e.preventDefault();
              onForgot();
            }
          }}
        >
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
      <p className="text-center text-xs text-muted">
        Platform administrator?{" "}
        <Link href="/admin/login" className="font-semibold">
          Admin sign in
        </Link>
      </p>
    </form>
  );
}
