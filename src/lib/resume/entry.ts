// "B.E. Computer Science, Anna University, 2025" → ["B.E. Computer Science",
// "Anna University, 2025"]: the main part is shown bold with the rest
// underneath, as in the resume board.
export function splitEntry(text: string): [string, string] {
  const m = text.match(/^(.{3,80}?)\s*(?:,|\s[-–—|·]\s|\()\s*(.+)$/);
  if (!m) return [text, ""];
  const detail = m[2].includes("(") ? m[2] : m[2].replace(/\)$/, "");
  return [m[1], detail];
}
