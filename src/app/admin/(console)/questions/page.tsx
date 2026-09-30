import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/layout/section-placeholder";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Question bank" };

export default async function Page() {
  await requireAdmin();
  return (
    <SectionPlaceholder
      icon="book"
      title="Question bank"
      description="Add, edit and delete the questions the AI draws on, by role, skill, difficulty and type."
    />
  );
}
