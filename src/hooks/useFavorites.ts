import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("favorites")
      .select("post_id")
      .eq("user_id", uid);
    if (data) {
      setFavoriteIds(new Set(data.map((f) => f.post_id)));
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        await fetchFavorites(user.id);
      }
      setLoading(false);
    };
    init();
  }, [fetchFavorites]);

  const toggleFavorite = useCallback(async (postId: string): Promise<boolean | null> => {
    if (!userId) return null; // not logged in

    const isFav = favoriteIds.has(postId);
    if (isFav) {
      // Remove
      setFavoriteIds((prev) => { const s = new Set(prev); s.delete(postId); return s; });
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", userId)
        .eq("post_id", postId);
      if (error) {
        setFavoriteIds((prev) => new Set(prev).add(postId));
        return null;
      }
      return false;
    } else {
      // Add
      setFavoriteIds((prev) => new Set(prev).add(postId));
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: userId, post_id: postId });
      if (error) {
        setFavoriteIds((prev) => { const s = new Set(prev); s.delete(postId); return s; });
        return null;
      }
      return true;
    }
  }, [userId, favoriteIds]);

  const isFavorite = useCallback((postId: string) => favoriteIds.has(postId), [favoriteIds]);

  const refresh = useCallback(() => {
    if (userId) fetchFavorites(userId);
  }, [userId, fetchFavorites]);

  return { isFavorite, toggleFavorite, favoriteIds, userId, loading, refresh };
}
