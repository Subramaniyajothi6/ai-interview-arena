import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/layout/section-placeholder";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Analytics" };

export default async function Page() {
  await requireAdmin();
  return (
    <SectionPlaceholder
      icon="chart"
      title="Analytics"
      description="Platform-wide score trends, score distribution and performance by criterion and interview type."
    />
  );
}
