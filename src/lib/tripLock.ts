import { supabase } from "@/integrations/supabase/client";

/**
 * Check if a user has an active trip booking (trip_accept without trip_cancel).
 * Returns the conversation ID if locked, or null if free.
 */
export async function checkActiveTripLock(userId: string): Promise<string | null> {
  // Get all conversations this user is part of
  const { data: convs } = await supabase
    .from("conversations")
    .select("id")
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`);

  if (!convs || convs.length === 0) return null;

  for (const conv of convs) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("content")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });

    if (!msgs) continue;

    // Check if there's a trip_accept without a matching trip_cancel or trip_complete
    const accepts: Array<{ from: string; to: string; tripId?: string }> = [];
    const terminatorKeys = new Set<string>();

    const tripKey = (p: any) => p.tripId || `${p.from}|${p.to}`;

    for (const m of msgs) {
      try {
        const parsed = JSON.parse(m.content);
        if (parsed?.type === "trip_accept") {
          accepts.push({ from: parsed.from, to: parsed.to, tripId: parsed.tripId });
        } else if (parsed?.type === "trip_cancel" || parsed?.type === "trip_complete") {
          terminatorKeys.add(tripKey(parsed));
        }
      } catch {}
    }

    // Check if any accept doesn't have a matching cancel or complete
    for (const accept of accepts) {
      if (!terminatorKeys.has(tripKey(accept))) return conv.id;
    }
  }

  return null;
}
