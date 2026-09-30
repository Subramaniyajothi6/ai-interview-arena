import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/layout/section-placeholder";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Reports" };

export default async function Page() {
  await requireAdmin();
  return (
    <SectionPlaceholder
      icon="file"
      title="Reports"
      description="Final interview reports for every candidate."
    />
  );
}
