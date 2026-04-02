import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useUnreadCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let userId: string | null = null;

    const fetchCount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;

      // Count messages where I'm a participant but not the sender, and not read
      const { count: unread } = await supabase
        .from("messages")
        .select("id, conversation:conversations!inner(participant_1, participant_2)", { count: "exact", head: true })
        .is("read_at", null)
        .neq("sender_id", user.id)
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`, { referencedTable: "conversations" });

      setCount(unread || 0);
    };

    fetchCount();

    // Listen for new messages
    const channel = supabase
      .channel("unread-badge")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        fetchCount();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => {
        fetchCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
