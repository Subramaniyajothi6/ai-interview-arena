import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/layout/section-placeholder";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Candidates" };

export default async function Page() {
  await requireAdmin();
  return (
    <SectionPlaceholder
      icon="users"
      title="Candidates"
      description="Search, filter and open any candidate's profile, interview history and reports."
    />
  );
}
