import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { haversineMeters } from "@/lib/liveLocation";

interface TrackedPost {
  id: string;
  precise: boolean;
}

/**
 * Watches the device position and syncs to supabase.
 * - Precise posts: sync on every meaningful move (>= 30 m) for smooth follow.
 * - Fuzzy posts: only sync when moved > 500 m (privacy + battery).
 */
export function useMobileTracking(posts: TrackedPost[]) {
  const lastSynced = useRef<{ lat: number; lng: number } | null>(null);
  const watchId = useRef<number | null>(null);

  // Stable key so effect only restarts when the post set changes
  const key = posts
    .map((p) => `${p.id}:${p.precise ? 1 : 0}`)
    .sort()
    .join(",");

  useEffect(() => {
    if (posts.length === 0) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    const hasPrecise = posts.some((p) => p.precise);
    const moveThreshold = hasPrecise ? 30 : 500;

    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        if (
          lastSynced.current &&
          haversineMeters(lastSynced.current, next) < moveThreshold
        ) {
          return;
        }

        lastSynced.current = next;

        const nowIso = new Date().toISOString();
        await Promise.all(
          posts.map((p) =>
            supabase
              .from("posts")
              .update({
                live_latitude: next.lat,
                live_longitude: next.lng,
                live_updated_at: nowIso,
              })
              .eq("id", p.id),
          ),
        );
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );

    return () => {
      if (watchId.current != null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
