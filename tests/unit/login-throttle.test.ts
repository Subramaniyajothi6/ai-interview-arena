import { describe, expect, it } from "vitest";
import { lockoutMinutes, tooManyAttemptsMessage } from "@/lib/login-throttle";

const now = Date.UTC(2026, 9, 3, 12, 0, 0);
const minutesAgo = (...m: number[]) => m.map((x) => new Date(now - x * 60_000));

describe("lockoutMinutes", () => {
  it("allows sign-in below the limit", () => {
    expect(lockoutMinutes([], 5, now)).toBe(0);
    expect(lockoutMinutes(minutesAgo(1, 2, 3, 4), 5, now)).toBe(0);
  });

  it("locks once the limit is reached, until the oldest counted failure is 15 minutes old", () => {
    // 5 failures, the 5th most recent 4 minutes ago → 11 minutes left
    expect(lockoutMinutes(minutesAgo(0, 1, 2, 3, 4), 5, now)).toBe(11);
    // all just now → the full 15 minutes
    expect(lockoutMinutes(minutesAgo(0, 0, 0, 0, 0), 5, now)).toBe(15);
  });

  it("ignores failures older than the window and never reports less than a minute", () => {
    expect(lockoutMinutes(minutesAgo(1, 2, 3, 16, 30), 5, now)).toBe(0);
    expect(lockoutMinutes(minutesAgo(1, 2, 3, 4, 14.99), 5, now)).toBe(1);
  });

  it("counts the most recent failures whatever order they come in", () => {
    expect(lockoutMinutes(minutesAgo(4, 0, 3, 1, 2, 20), 5, now)).toBe(11);
  });
});

describe("tooManyAttemptsMessage", () => {
  it("says how long to wait", () => {
    expect(tooManyAttemptsMessage(15)).toBe(
      "Too many sign-in attempts. Please wait 15 minutes and try again.",
    );
    expect(tooManyAttemptsMessage(1)).toMatch(/wait 1 minute and/);
  });
});
