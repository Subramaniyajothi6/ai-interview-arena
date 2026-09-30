import { DIFFICULTIES, INTERVIEW_TYPES, JOB_ROLES } from "@/lib/constants";

type SearchParams = Record<string, string | string[] | undefined>;

export const PAGE_SIZE = 20;

// Reads one string search param, restricted to an allow-list when given.
export function param(sp: SearchParams, key: string, allowed?: readonly string[]): string {
  const v = sp[key];
  const s = typeof v === "string" ? v : "";
  return allowed && !allowed.includes(s) ? "" : s;
}

export function pageParam(sp: SearchParams) {
  const n = Number(param(sp, "page"));
  return Number.isInteger(n) && n > 0 ? n : 1;
}

// Search text safe to put inside a PostgREST `or()` filter: keeps letters,
// digits and a few symbols, drops characters with filter meaning (, ( ) * % ").
export function searchTerm(sp: SearchParams) {
  return param(sp, "q")
    .replace(/[^\p{L}\p{N} @_.+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export const ROLE_VALUES = JOB_ROLES as readonly string[];
export const TYPE_VALUES = INTERVIEW_TYPES.map((t) => t.value) as readonly string[];
export const DIFFICULTY_VALUES = DIFFICULTIES.map((d) => d.value) as readonly string[];
export const STATUS_VALUES = ["setup", "ready", "in_progress", "completed", "abandoned"] as const;
