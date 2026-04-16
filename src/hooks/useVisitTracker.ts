import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId } from "@/lib/deviceId";
import { haversineMeters } from "@/lib/liveLocation";

interface NearbyPost {
  id: string;
  latitude: number;
  longitude: number;
  is_mobile?: boolean;
}

const PROXIMITY_METERS = 500;
const QUALIFY_SECONDS = 15 * 60; // 15 minutes
const SYNC_INTERVAL_MS = 60_000; // sync to DB every minute
const TICK_INTERVAL_MS = 30_000; // re-evaluate proximity every 30s

interface SessionState {
  postId: string;
  enteredAt: number;
  lastTickAt: number;
  accumulatedSec: number;
  syncedSec: number;
  qualified: boolean;
}

/**
 * Tracks how long the authenticated user lingers within 500m of fixed merchants.
 * When dwell time reaches 15 minutes, marks user_visits.qualified=true so the
 * user becomes eligible to leave a review for that merchant.
 *
 * Performance: reads userPos and posts from refs so the effect doesn't re-run
 * on every position update. A single throttled interval evaluates proximity.
 */
export function useVisitTracker(
  userId: string | null,
  userPos: { lat: number; lng: number } | null,
  posts: NearbyPost[],
) {
  const sessionsRef = useRef<Map<string, SessionState>>(new Map());
  const userPosRef = useRef(userPos);
  const postsRef = useRef(posts);
  const tickRef = useRef<number | null>(null);
  const syncRef = useRef<number | null>(null);

  // Keep refs fresh without re-running the heavy effect
  useEffect(() => { userPosRef.current = userPos; }, [userPos]);
  useEffect(() => { postsRef.current = posts; }, [posts]);

  useEffect(() => {
    if (!userId) return;

    const evaluate = () => {
      const pos = userPosRef.current;
      if (!pos) return;
      const now = Date.now();
      const sessions = sessionsRef.current;
      const fixedPosts = postsRef.current.filter((p) => !p.is_mobile);

      for (const post of fixedPosts) {
        const distance = haversineMeters(pos, { lat: post.latitude, lng: post.longitude });
        const existing = sessions.get(post.id);

        if (distance <= PROXIMITY_METERS) {
          if (!existing) {
            sessions.set(post.id, {
              postId: post.id,
              enteredAt: now,
              lastTickAt: now,
              accumulatedSec: 0,
              syncedSec: 0,
              qualified: false,
            });
          } else {
            const delta = Math.min((now - existing.lastTickAt) / 1000, 60);
            existing.accumulatedSec += delta;
            existing.lastTickAt = now;
            if (!existing.qualified && existing.accumulatedSec >= QUALIFY_SECONDS) {
              existing.qualified = true;
            }
          }
        } else if (existing) {
          existing.lastTickAt = now;
        }
      }
    };

    // Run once immediately, then on a slow interval
    evaluate();
    tickRef.current = window.setInterval(evaluate, TICK_INTERVAL_MS);

    syncRef.current = window.setInterval(async () => {
      const deviceId = getDeviceId();
      for (const [postId, s] of sessionsRef.current.entries()) {
        if (s.accumulatedSec - s.syncedSec < 30 && !s.qualified) continue;
        const { error } = await supabase
          .from("user_visits" as any)
          .upsert(
            {
              user_id: userId,
              post_id: postId,
              device_id: deviceId,
              last_seen_at: new Date().toISOString(),
              total_duration_seconds: Math.floor(s.accumulatedSec),
              qualified: s.qualified,
            },
            { onConflict: "user_id,post_id" },
          );
        if (!error) s.syncedSec = s.accumulatedSec;
      }
    }, SYNC_INTERVAL_MS);

    return () => {
      if (tickRef.current != null) clearInterval(tickRef.current);
      if (syncRef.current != null) clearInterval(syncRef.current);
      tickRef.current = null;
      syncRef.current = null;
    };
  }, [userId]);
}
