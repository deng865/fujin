import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface CreditsState {
  postCredits: number;
  unlimitedUntil: string | null;
  hasUnlimited: boolean;
  bonusRemaining: number;
  bonusExpiresAt: string | null;
  canPost: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useCredits(): CreditsState {
  const { user } = useAuth();
  const [postCredits, setPostCredits] = useState(0);
  const [unlimitedUntil, setUnlimitedUntil] = useState<string | null>(null);
  const [bonusRemaining, setBonusRemaining] = useState(0);
  const [bonusExpiresAt, setBonusExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setPostCredits(0);
      setUnlimitedUntil(null);
      setBonusRemaining(0);
      setLoading(false);
      return;
    }
    const [{ data }, { data: bonus }] = await Promise.all([
      supabase.from("user_credits").select("post_credits, unlimited_until").eq("user_id", user.id).maybeSingle(),
      supabase.rpc("get_welcome_bonus", { _user_id: user.id }),
    ]);
    const b = (bonus ?? {}) as { remaining?: number; expires_at?: string | null };
    setPostCredits(data?.post_credits ?? 0);
    setUnlimitedUntil(data?.unlimited_until ?? null);
    setBonusRemaining(b.remaining ?? 0);
    setBonusExpiresAt(b.remaining ? b.expires_at ?? null : null);
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
    bonusRemaining,
    bonusExpiresAt,
    canPost: hasUnlimited || postCredits > 0 || bonusRemaining > 0,
    loading,
    refresh,
  };
}
