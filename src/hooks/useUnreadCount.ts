import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useUnreadCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async (uid: string) => {
    const { count: unread } = await supabase
      .from("messages")
      .select("id, conversation:conversations!inner(participant_1, participant_2)", { count: "exact", head: true })
      .is("read_at", null)
      .neq("sender_id", uid)
      .or(`participant_1.eq.${uid},participant_2.eq.${uid}`, { referencedTable: "conversations" });

    setCount(unread || 0);
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setCount(0);
      return;
    }

    void fetchCount(user.id);

    const channel = supabase
      .channel(`unread-badge-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        void fetchCount(user.id);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => {
        void fetchCount(user.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchCount]);

  return count;
}
