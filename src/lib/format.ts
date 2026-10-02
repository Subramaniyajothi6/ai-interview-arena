import { DIFFICULTIES, EXPERIENCE_LEVELS, INTERVIEW_TYPES, labelFor } from "./constants";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const shortFmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" });

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatShortDate = (iso: string) => shortFmt.format(new Date(iso));

export const typeLabel = (v: string | null | undefined) => labelFor(INTERVIEW_TYPES, v);
export const difficultyLabel = (v: string | null | undefined) => labelFor(DIFFICULTIES, v);
export const experienceLabel = (v: string | null | undefined) => labelFor(EXPERIENCE_LEVELS, v);

export const STATUS_LABELS: Record<string, { label: string; chip: string }> = {
  setup: { label: "Setting up", chip: "chip-n" },
  ready: { label: "Ready", chip: "chip-n" },
  in_progress: { label: "In progress", chip: "chip-warn" },
  completed: { label: "Completed", chip: "chip-ok" },
  abandoned: { label: "Incomplete", chip: "chip-bad" },
};

// ISO timestamp for `days` days before now (for date-range filters).
export function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 864e5).toISOString();
}

// Current time in ms (kept out of component bodies for the React purity lint rule).
export function nowMs() {
  return Date.now();
}

// Time between two timestamps as m:ss, or h:mm:ss past an hour ("—" if either is missing).
export function formatDuration(start: string | null, end: string | null) {
  if (!start || !end) return "—";
  const total = Math.max(
    0,
    Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000),
  );
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}
