// Server actions called from the browser throw a TypeError when the request
// can't reach the server (offline, dropped connection). Turn that into a
// message the page can show; any other error (including Next.js redirects)
// is re-thrown unchanged.
export const OFFLINE_MESSAGE =
  "We couldn't reach the server. Check your internet connection and try again.";

export async function withNetworkErrors<T>(
  call: () => Promise<T>,
): Promise<T | { networkError: string }> {
  try {
    return await call();
  } catch (e) {
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    if (offline || e instanceof TypeError) return { networkError: OFFLINE_MESSAGE };
    throw e;
  }
}

export function isNetworkError(value: unknown): value is { networkError: string } {
  return typeof value === "object" && value !== null && "networkError" in value;
}
