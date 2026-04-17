import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const userId = user?.id ?? null;

  useEffect(() => {
    const check = async () => {
      if (authLoading) return;
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const ADMIN_EMAILS = ["lmfine720@outlook.com"];
      if (ADMIN_EMAILS.includes(user.email || "")) {
        setIsAdmin(true);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      setIsAdmin(!!data);
      setLoading(false);
    };
    setLoading(true);
    void check();
  }, [user?.id, user?.email, authLoading]);

  return { isAdmin, loading, userId };
}
