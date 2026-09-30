import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/layout/section-placeholder";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Interviews" };

export default async function Page() {
  await requireAdmin();
  return (
    <SectionPlaceholder
      icon="message"
      title="Interviews"
      description="Every interview with its questions, the candidate's answers and the AI evaluation."
    />
  );
}
