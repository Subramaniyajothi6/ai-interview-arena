import type { Metadata } from "next";
import { AdminLoginForm } from "./admin-login-form";

export const metadata: Metadata = { title: "Admin sign in" };

const NOTICES: Record<string, string> = {
  not_admin: "This account does not have administrator access.",
};

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { error } = await searchParams;
  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink px-4 py-10">
      <AdminLoginForm notice={typeof error === "string" ? NOTICES[error] : undefined} />
    </div>
  );
}
