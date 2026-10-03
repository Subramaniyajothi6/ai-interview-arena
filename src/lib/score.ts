// Score bands used to colour rings and bars: green from 75, amber from 50, red below.
export type ScoreBand = "good" | "mid" | "low";

export function scoreBand(score: number): ScoreBand {
  return score >= 75 ? "good" : score >= 50 ? "mid" : "low";
}

// CSS colour for a band (theme tokens, so it adapts to light and dark).
export const bandColor = (score: number) => `var(--color-score-${scoreBand(score)})`;
