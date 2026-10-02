// "Remember me" off: the login sets this cookie, every later auth cookie
// write drops its expiry (so the browser forgets the session when it closes),
// and the session is also ended on the server once the cookie's deadline
// passes, because some browsers restore "closed" sessions.
export const SESSION_ONLY_COOKIE = "aia-session-only";
export const SESSION_ONLY_HOURS = 12;

type CookieOptions = { maxAge?: number; expires?: Date | number | string } & Record<
  string,
  unknown
>;

export function authCookieOptions<T extends CookieOptions>(options: T, sessionOnly: boolean): T {
  if (!sessionOnly) return options;
  const rest = { ...options };
  delete rest.maxAge;
  delete rest.expires;
  return rest;
}

/** Cookie value for a new session-only login: its deadline in ms. */
export function sessionOnlyDeadline(now = Date.now()) {
  return String(now + SESSION_ONLY_HOURS * 60 * 60 * 1000);
}

/** True when a session-only login has passed its deadline (or the value is invalid). */
export function sessionOnlyExpired(value: string | undefined, now = Date.now()) {
  if (value === undefined) return false;
  const deadline = Number(value);
  return !Number.isFinite(deadline) || now > deadline;
}
