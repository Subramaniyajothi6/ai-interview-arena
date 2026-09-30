import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/layout/section-placeholder";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Settings" };

export default async function Page() {
  await requireAdmin();
  return (
    <SectionPlaceholder
      icon="settings"
      title="Settings"
      description="Interview defaults, voice answers, follow-up questions and resume upload limits."
    />
  );
}
