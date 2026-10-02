import type { Json } from "@/lib/supabase/database.types";

// Shapes of the improvement_plans JSON columns (see the schema migration).
export type PlanWeek = {
  week: number;
  title: string;
  topics: string[];
  hours?: number;
  reason?: string;
};
export type PlanTopic = { topic: string; improves?: string; priority?: "high" | "medium" | "low" };
export type PlanQuestion = { question: string; difficulty?: string };
export type PlanProject = {
  title: string;
  description?: string;
  duration?: string;
  skills?: string[];
  builds?: string; // the recommended topic this project practises
};

export function planList<T>(value: Json): T[] {
  return Array.isArray(value) ? (value as unknown as T[]) : [];
}
