import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface CreditsState {
  postCredits: number;
  unlimitedUntil: string | null;
  hasUnlimited: boolean;
  canPost: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useCredits(): CreditsState {
  const { user } = useAuth();
  const [postCredits, setPostCredits] = useState(0);
  const [unlimitedUntil, setUnlimitedUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setPostCredits(0);
      setUnlimitedUntil(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("user_credits")
      .select("post_credits, unlimited_until")
      .eq("user_id", user.id)
      .maybeSingle();
    setPostCredits(data?.post_credits ?? 0);
    setUnlimitedUntil(data?.unlimited_until ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasUnlimited = !!unlimitedUntil && new Date(unlimitedUntil).getTime() > Date.now();

  return {
    postCredits,
    unlimitedUntil,
    hasUnlimited,
    canPost: hasUnlimited || postCredits > 0,
    loading,
    refresh,
  };
}
