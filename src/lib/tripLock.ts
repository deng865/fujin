import { supabase } from "@/integrations/supabase/client";

const LOCK_CACHE_TTL_MS = 15_000;
const lockCache = new Map<string, { value: string | null; expiresAt: number }>();
const pendingChecks = new Map<string, Promise<string | null>>();

function tripKey(payload: { from: string; to: string; tripId?: string }) {
  return payload.tripId || `${payload.from}|${payload.to}`;
}

function getCachedLock(userId: string) {
  const cached = lockCache.get(userId);
  if (!cached) return undefined;
  if (cached.expiresAt < Date.now()) {
    lockCache.delete(userId);
    return undefined;
  }
  return cached.value;
}

function setCachedLock(userId: string, value: string | null) {
  lockCache.set(userId, { value, expiresAt: Date.now() + LOCK_CACHE_TTL_MS });
}

export function invalidateTripLockCache(userId?: string) {
  if (userId) {
    lockCache.delete(userId);
    pendingChecks.delete(userId);
    return;
  }

  lockCache.clear();
  pendingChecks.clear();
}

/**
 * Check if a user has an active trip booking (trip_accept without trip_cancel).
 * Returns the conversation ID if locked, or null if free.
 */
export async function checkActiveTripLock(userId: string): Promise<string | null> {
  const cached = getCachedLock(userId);
  if (cached !== undefined) return cached;

  const pending = pendingChecks.get(userId);
  if (pending) return pending;

  const request = (async () => {
    const { data: conversations } = await supabase
      .from("conversations")
      .select("id, updated_at")
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
      .order("updated_at", { ascending: false });

    if (!conversations || conversations.length === 0) {
      setCachedLock(userId, null);
      return null;
    }

    const conversationIds = conversations.map((conversation) => conversation.id);
    const { data: messages } = await supabase
      .from("messages")
      .select("conversation_id, content, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: true });

    if (!messages || messages.length === 0) {
      setCachedLock(userId, null);
      return null;
    }

    const stateByConversation = new Map<string, {
      accepts: Array<{ from: string; to: string; tripId?: string }>;
      terminators: Set<string>;
    }>();

    conversations.forEach((conversation) => {
      stateByConversation.set(conversation.id, { accepts: [], terminators: new Set<string>() });
    });

    for (const message of messages) {
      const current = stateByConversation.get(message.conversation_id);
      if (!current) continue;

      try {
        const parsed = JSON.parse(message.content);
        if (parsed?.type === "trip_accept") {
          current.accepts.push({ from: parsed.from, to: parsed.to, tripId: parsed.tripId });
        } else if (parsed?.type === "trip_cancel" || parsed?.type === "trip_complete") {
          current.terminators.add(tripKey(parsed));
        }
      } catch {}
    }

    for (const conversation of conversations) {
      const current = stateByConversation.get(conversation.id);
      if (!current) continue;

      const hasActiveTrip = current.accepts.some((accept) => !current.terminators.has(tripKey(accept)));
      if (hasActiveTrip) {
        setCachedLock(userId, conversation.id);
        return conversation.id;
      }
    }

    setCachedLock(userId, null);
    return null;
  })();

  pendingChecks.set(userId, request);

  try {
    return await request;
  } finally {
    pendingChecks.delete(userId);
  }
}
