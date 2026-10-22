import crypto from 'crypto';

interface TicketData {
  userId: string;
  expiresAt: number;
}

// In-memory store for one-time short-lived stream tickets
const tickets = new Map<string, TicketData>();

// Cleanup expired tickets every minute
setInterval(() => {
  const now = Date.now();
  for (const [ticket, data] of tickets.entries()) {
    if (data.expiresAt <= now) {
      tickets.delete(ticket);
    }
  }
}, 60_000).unref();

/**
 * Generates a short-lived (30s) single-use ticket for SSE connection
 */
export function createStreamTicket(userId: string): string {
  const ticket = crypto.randomBytes(24).toString('hex');
  tickets.set(ticket, {
    userId,
    expiresAt: Date.now() + 30_000, // 30 seconds
  });
  return ticket;
}

/**
 * Validates and immediately consumes (deletes) the ticket
 * Returns the userId if valid and not expired, null otherwise
 */
export function consumeStreamTicket(ticket: string): string | null {
  if (!ticket || typeof ticket !== 'string') return null;

  const data = tickets.get(ticket);
  if (!data) return null;

  // Single-use: delete immediately to prevent reuse
  tickets.delete(ticket);

  if (data.expiresAt <= Date.now()) {
    return null;
  }

  return data.userId;
}
