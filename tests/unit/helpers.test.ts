import { describe, expect, it } from "vitest";
import { pageParam, param, searchTerm } from "@/lib/admin-query";
import { EXPERIENCE_LEVELS, labelFor } from "@/lib/constants";
import { csvCell } from "@/lib/csv";
import {
  difficultyLabel,
  experienceLabel,
  formatDuration,
  STATUS_LABELS,
  typeLabel,
} from "@/lib/format";
import { planList } from "@/lib/plan";
import {
  authCookieOptions,
  sessionOnlyDeadline,
  sessionOnlyExpired,
} from "@/lib/supabase/remember";

describe("admin search parameters", () => {
  it("strips characters that have meaning in database filters", () => {
    expect(searchTerm({ q: "priya),role.eq.admin" })).toBe("priya role.eq.admin");
    expect(searchTerm({ q: 'a%b*c"d' })).toBe("a b c d");
    expect(searchTerm({ q: "karthik.s@email.com" })).toBe("karthik.s@email.com");
  });

  it("limits search length and ignores arrays", () => {
    expect(searchTerm({ q: "x".repeat(200) })).toHaveLength(60);
    expect(searchTerm({ q: ["a", "b"] })).toBe("");
  });

  it("only accepts allow-listed filter values", () => {
    expect(param({ status: "completed" }, "status", ["completed"])).toBe("completed");
    expect(param({ status: "drop table" }, "status", ["completed"])).toBe("");
  });

  it("parses page numbers safely", () => {
    expect(pageParam({ page: "3" })).toBe(3);
    for (const bad of ["0", "-1", "abc", "1.5"]) expect(pageParam({ page: bad })).toBe(1);
  });
});

describe("CSV export", () => {
  it("quotes commas, quotes and new lines", () => {
    expect(csvCell('Rao, "Ananya"')).toBe('"Rao, ""Ananya"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(csvCell(null)).toBe("");
    expect(csvCell(42)).toBe("42");
  });

  it("neutralises spreadsheet formulas", () => {
    expect(csvCell('=HYPERLINK("http://evil")')).toMatch(/^"'=/);
    expect(csvCell("+91 98765")).toBe("'+91 98765");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });
});

describe("labels", () => {
  it("maps stored values to the labels shown in the UI", () => {
    expect(experienceLabel("0-1")).toBe("0–1 Years");
    expect(typeLabel("hr")).toBe("HR");
    expect(difficultyLabel("expert")).toBe("Expert");
    expect(STATUS_LABELS.abandoned.label).toBe("Incomplete");
    expect(labelFor(EXPERIENCE_LEVELS, "unknown")).toBe("unknown");
    expect(labelFor(EXPERIENCE_LEVELS, null)).toBe("—");
  });
});

describe("remember me", () => {
  const options = { path: "/", maxAge: 3600, expires: new Date(0), httpOnly: true };

  it("keeps cookie expiry when the user asked to be remembered", () => {
    expect(authCookieOptions(options, false)).toEqual(options);
  });

  it("turns auth cookies into browser-session cookies otherwise", () => {
    const result = authCookieOptions(options, true);
    expect(result).toEqual({ path: "/", httpOnly: true });
    expect(options.maxAge).toBe(3600); // input is not changed
  });

  it("ends a session-only login 12 hours after signing in", () => {
    const start = Date.UTC(2026, 9, 1, 9, 0);
    const deadline = sessionOnlyDeadline(start);
    expect(sessionOnlyExpired(deadline, start + 11 * 3600_000)).toBe(false);
    expect(sessionOnlyExpired(deadline, start + 13 * 3600_000)).toBe(true);
  });

  it("treats a missing cookie as remembered and a broken one as expired", () => {
    expect(sessionOnlyExpired(undefined)).toBe(false);
    expect(sessionOnlyExpired("not-a-number")).toBe(true);
  });
});

describe("improvement plan data", () => {
  it("reads JSON arrays and ignores anything else", () => {
    expect(planList([{ topic: "SQL" }])).toEqual([{ topic: "SQL" }]);
    expect(planList(null)).toEqual([]);
    expect(planList({ topic: "SQL" })).toEqual([]);
  });
});

describe("formatDuration", () => {
  const at = (s: number) => new Date(Date.UTC(2026, 9, 2, 10, 0, s)).toISOString();
  it("formats minutes and seconds, and hours past an hour", () => {
    expect(formatDuration(at(0), at(5))).toBe("0:05");
    expect(formatDuration(at(0), at(754))).toBe("12:34");
    expect(formatDuration(at(0), at(3725))).toBe("1:02:05");
  });
  it("shows a dash when a time is missing and never goes negative", () => {
    expect(formatDuration(null, at(5))).toBe("—");
    expect(formatDuration(at(0), null)).toBe("—");
    expect(formatDuration(at(10), at(0))).toBe("0:00");
  });
});
