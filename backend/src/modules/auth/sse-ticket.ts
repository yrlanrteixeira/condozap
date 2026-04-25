/**
 * SSE Ticket — short-lived (60s) JWT used to authenticate the EventSource
 * stream. Issued by an authenticated POST so the long-lived access token
 * never appears in URL query strings (which leak via logs/Referer/history).
 *
 * The browser EventSource API does not support custom headers, so query
 * authentication is unavoidable; we just keep the surface minimal.
 */
export interface SseTicketPayload {
  userId: string;
  type: "sse";
}

interface JwtSigner {
  sign: (payload: any, options: any) => string;
  verify: <T = any>(token: string) => T;
}

const TICKET_TTL_SECONDS = 60;

export function issueSseTicket(jwt: JwtSigner, userId: string): string {
  return jwt.sign(
    { id: userId, type: "sse" } as const,
    { expiresIn: TICKET_TTL_SECONDS }
  );
}

export function verifySseTicket(
  jwt: JwtSigner,
  ticket: string
): { userId: string } | null {
  try {
    const decoded = jwt.verify<{ id?: string; sub?: string; type?: string }>(
      ticket
    );
    if (decoded.type !== "sse") return null;
    const userId = decoded.id ?? decoded.sub;
    if (!userId) return null;
    return { userId };
  } catch {
    return null;
  }
}
