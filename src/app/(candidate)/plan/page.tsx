import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Improvement plan" };

// The full plan view is built with the AI evaluation step; until a plan
// exists this explains how to get one.
export default async function PlanPage() {
  const { supabase } = await requireUser("/plan");
  const { count } = await supabase
    .from("improvement_plans")
    .select("id", { count: "exact", head: true });

  return (
    <div className="mx-auto max-w-[1120px]">
      <section className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <Icon name="map" size={22} />
        </span>
        <span className="eyebrow">AI career feedback</span>
        <h2 className="text-lg">
          {count
            ? "Your plan is being prepared"
            : "Your personalised plan starts with an interview"}
        </h2>
        <p className="max-w-md text-sm text-muted">
          After each interview, the AI turns your evaluation into a week-by-week learning plan with
          recommended topics, practice questions, suggested projects and interview tips.
        </p>
        <Link href="/interview/new" className="btn mt-1">
          Take an interview
          <Icon name="arrowRight" size={16} />
        </Link>
      </section>
    </div>
  );
}
