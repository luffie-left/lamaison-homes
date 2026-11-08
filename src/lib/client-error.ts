/**
 * Client-side helpers for surfacing real server error messages.
 *
 * Our API routes return JSON error bodies in one of these shapes:
 *   { error: string }                      (most routes)
 *   { error: string, code?: string }       (quote / payment create-order —
 *                                           BookabilityError, e.g. MIN_STAY_NOT_MET)
 *   { error: string, code?: string, blocked?: true }
 *
 * These helpers extract the human message when present and fall back to a
 * generic line only when the body is absent or unparseable. Server logic is
 * untouched — this is presentation only. The server check stays authoritative.
 */

export interface ServerErrorBody {
  error?: unknown;
  message?: unknown;
  code?: unknown;
}

/**
 * Extract a human-readable message from a parsed JSON error body.
 * Returns null when there is no usable message (caller shows its fallback).
 */
export function serverErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const b = body as ServerErrorBody;
  for (const key of ["error", "message"] as const) {
    const v = b[key];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
}

/**
 * Safely parse a fetch Response's JSON body (never throws).
 * Returns null on parse failure.
 */
export async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Parse `res` (a non-ok Response) and return the server's message, or
 * `fallback` when the body has no usable message.
 */
export async function serverErrorOr(
  res: Response,
  fallback: string
): Promise<string> {
  return serverErrorMessage(await safeJson(res)) ?? fallback;
}
