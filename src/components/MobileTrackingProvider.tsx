import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMobileTracking } from "@/hooks/useMobileTracking";

/**
 * Globally tracks the current user's location for any of their active mobile posts.
 * Mounted once at the app shell so location stays in sync across pages.
 */
export default function MobileTrackingProvider() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<{ id: string; precise: boolean }[]>([]);

  useEffect(() => {
    if (!user) {
      setPosts([]);
      return;
    }
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, mobile_location_precise, is_visible, is_mobile")
        .eq("user_id", user.id)
        .eq("is_mobile", true)
        .eq("is_visible", true);
      if (cancelled) return;
      setPosts(
        (data || []).map((p: any) => ({
          id: p.id,
          precise: !!p.mobile_location_precise,
        })),
      );
    };

    load();

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
      supabase.removeChannel(channel);
    };
  }, [user]);

  useMobileTracking(posts);
  return null;
}
