import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLocationPrivacy } from "@/hooks/useLocationPrivacy";
import { mobileOnline } from "@/lib/locationPrivacy";
import { useMobileTracking } from "@/hooks/useMobileTracking";

/**
 * Globally tracks the current user's location for any of their active mobile posts.
 * Mounted once at the app shell so location stays in sync across pages.
 */
export default function MobileTrackingProvider() {
  const { user } = useAuth();
  const { serviceEnabled } = useLocationPrivacy();
  const [posts, setPosts] = useState<{ id: string; precise: boolean }[]>([]);

  useEffect(() => {
    if (!user || !serviceEnabled) {
      setPosts([]);
      return;
    }
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, mobile_location_precise, is_visible, is_mobile, operating_hours")
        .eq("user_id", user.id)
        .eq("is_mobile", true)
        .eq("is_visible", true);
      if (cancelled) return;
      setPosts(
        (data || []).filter((p) => mobileOnline({ ...p, operating_hours: p.operating_hours as unknown as Parameters<typeof mobileOnline>[0]["operating_hours"] })).map((p: any) => ({
          id: p.id,
          precise: !!p.mobile_location_precise,
        })),
      );
    };

    load();
    const timer = window.setInterval(load, 15000);
    window.addEventListener("location-privacy-changed", load);

    // Refresh when the user's posts change (publish, edit, hide, delete).
    const channel = supabase
      .channel(`mobile-tracking-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
          filter: `user_id=eq.${user.id}`,
        },
        load,
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("location-privacy-changed", load);
      supabase.removeChannel(channel);
    };
  }, [user, serviceEnabled]);

  useMobileTracking(serviceEnabled ? posts : []);
  return null;
}
