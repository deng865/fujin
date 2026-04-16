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
const TICK_INTERVAL_MS = 5_000; // local tick

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
 */
export function useVisitTracker(
  userId: string | null,
  userPos: { lat: number; lng: number } | null,
  posts: NearbyPost[],
) {
  const sessionsRef = useRef<Map<string, SessionState>>(new Map());
  const tickRef = useRef<number | null>(null);
  const syncRef = useRef<number | null>(null);

  useEffect(() => {
    if (!userId || !userPos) return;

    const fixedPosts = posts.filter((p) => !p.is_mobile);
    const now = Date.now();
    const sessions = sessionsRef.current;

    // Update sessions based on current proximity
    for (const post of fixedPosts) {
      const distance = haversineMeters(userPos, { lat: post.latitude, lng: post.longitude });
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
          const delta = Math.min((now - existing.lastTickAt) / 1000, 30); // cap to avoid background jumps
          existing.accumulatedSec += delta;
          existing.lastTickAt = now;
          if (!existing.qualified && existing.accumulatedSec >= QUALIFY_SECONDS) {
            existing.qualified = true;
          }
        }
      } else if (existing) {
        // Left proximity — keep accumulated time but reset entry
        existing.lastTickAt = now;
      }
    }

    // Periodic local tick & DB sync
    if (tickRef.current == null) {
      tickRef.current = window.setInterval(() => {
        const t = Date.now();
        sessionsRef.current.forEach((s) => {
          // Just bump lastTickAt; accumulation happens when posts/userPos updates
          s.lastTickAt = t;
        });
      }, TICK_INTERVAL_MS);
    }

    if (syncRef.current == null) {
      syncRef.current = window.setInterval(async () => {
        const deviceId = getDeviceId();
        for (const [postId, s] of sessionsRef.current.entries()) {
          if (s.accumulatedSec - s.syncedSec < 30 && !s.qualified) continue;
          // Upsert visit record
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
    }

    return () => {
      // Don't clear here — keep timers alive while hook is mounted
    };
  }, [userId, userPos, posts]);

  useEffect(() => {
    return () => {
      if (tickRef.current != null) clearInterval(tickRef.current);
      if (syncRef.current != null) clearInterval(syncRef.current);
      tickRef.current = null;
      syncRef.current = null;
    };
  }, []);
}
