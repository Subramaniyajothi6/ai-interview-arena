"use client";

import { useState } from "react";
import { ForgotCard } from "./forgot-card";
import { LoginForm } from "./login-form";

// Login form, plus the reset-password card that opens beside it (wide
// screens only) when the user clicks "Forgot password?".
export function LoginPanel({ next, notice }: { next?: string; notice?: string }) {
  const [showReset, setShowReset] = useState(false);

  return (
    // `auth-wide` lets the auth layout make room for the card.
    <div className={`flex items-center gap-8 ${showReset ? "auth-wide" : ""}`}>
      <LoginForm next={next} notice={notice} onForgot={() => setShowReset(true)} />
      {showReset && <ForgotCard onClose={() => setShowReset(false)} />}
    </div>
  );
}
