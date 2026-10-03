"use client";

import { useFormStatus } from "react-dom";
import { Icon } from "./icon";

export function Field({
  id,
  label,
  error,
  hint,
  ...inputProps
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...inputProps}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FormAlert({ tone, children }: { tone: "error" | "success"; children: string }) {
  const error = tone === "error";
  return (
    <div
      role={error ? "alert" : "status"}
      className={`flex gap-2.5 rounded-[10px] border px-3.5 py-3 text-[13px] leading-normal ${
        error
          ? "border-danger-line bg-danger-bg text-danger"
          : "border-success-line bg-success-bg text-success"
      }`}
    >
      <Icon name={error ? "alert" : "check"} size={16} className="mt-px" />
      <span>{children}</span>
    </div>
  );
}

// Submit button that shows a pending state while the server action runs.
export function SubmitButton({
  children,
  pendingText,
  className = "btn btn-lg w-full",
}: {
  children: React.ReactNode;
  pendingText: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
