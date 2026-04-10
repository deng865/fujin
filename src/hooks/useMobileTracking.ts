import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { haversineMeters } from "@/lib/liveLocation";

const MOVE_THRESHOLD_METERS = 500;

/**
 * Watches the device position and syncs to supabase when the user
 * moves more than 500 m from the last synced position.
 * Only active when postIds is non-empty.
 */
export function useMobileTracking(postIds: string[]) {
  const lastSynced = useRef<{ lat: number; lng: number } | null>(null);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (postIds.length === 0) return;
    if (!navigator.geolocation) return;

    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        if (
          lastSynced.current &&
          haversineMeters(lastSynced.current, next) < MOVE_THRESHOLD_METERS
        ) {
          return;
        }

        lastSynced.current = next;

        // Update all active mobile posts for this user
        for (const id of postIds) {
          await supabase
            .from("posts")
            .update({
              live_latitude: next.lat,
              live_longitude: next.lng,
              live_updated_at: new Date().toISOString(),
            })
            .eq("id", id);
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    return () => {
      if (watchId.current != null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [postIds.join(",")]);
}
