import type { Metadata } from "next";
import { LoginPanel } from "./login-panel";

export const metadata: Metadata = { title: "Log in" };

const NOTICES: Record<string, string> = {
  link_expired: "That link is invalid or has expired. Please try again.",
  session_expired: "Your session has expired. Please log in again to continue.",
  account_disabled: "This account has been disabled. Contact the platform administrator.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  return (
    <LoginPanel
      next={typeof next === "string" ? next : undefined}
      notice={typeof error === "string" ? NOTICES[error] : undefined}
    />
  );
}
