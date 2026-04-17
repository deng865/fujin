import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const favoritesCache = new Map<string, Set<string>>();
const favoritesRequests = new Map<string, Promise<Set<string>>>();

async function loadFavoritesFromDb(uid: string) {
  const pending = favoritesRequests.get(uid);
  if (pending) return pending;

  const request = (async () => {
    const { data } = await supabase
      .from("favorites")
      .select("post_id")
      .eq("user_id", uid);

    const next = new Set((data || []).map((favorite) => favorite.post_id));
    favoritesCache.set(uid, next);
    return next;
  })();

  favoritesRequests.set(uid, request);

  try {
    return await request;
  } finally {
    favoritesRequests.delete(uid);
  }
}

export function useFavorites() {
  const { user, loading: authLoading } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const userId = user?.id ?? null;

  const fetchFavorites = useCallback(async (uid: string, options?: { force?: boolean }) => {
    if (!options?.force && favoritesCache.has(uid)) {
      const cached = new Set(favoritesCache.get(uid)!);
      setFavoriteIds(cached);
      return cached;
    }

    const loaded = await loadFavoritesFromDb(uid);
    const next = new Set(loaded);
    setFavoriteIds(next);
    return next;
  }, []);

  useEffect(() => {
    if (authLoading) return;

    const init = async () => {
      if (userId) {
        await fetchFavorites(userId);
      } else {
        setFavoriteIds(new Set());
      }
      setLoading(false);
    };

    setLoading(true);
    void init();
  }, [userId, authLoading, fetchFavorites]);

  const toggleFavorite = useCallback(async (postId: string): Promise<boolean | null> => {
    if (!userId) return null; // not logged in

    const isFav = favoriteIds.has(postId);
    if (isFav) {
      // Remove
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        favoritesCache.set(userId, new Set(next));
        return next;
      });
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", userId)
        .eq("post_id", postId);
      if (error) {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.add(postId);
          favoritesCache.set(userId, new Set(next));
          return next;
        });
        return null;
      }
      return false;
    } else {
      // Add
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.add(postId);
        favoritesCache.set(userId, new Set(next));
        return next;
      });
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: userId, post_id: postId });
      if (error) {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(postId);
          favoritesCache.set(userId, new Set(next));
          return next;
        });
        return null;
      }
      return true;
    }
  }, [userId, favoriteIds]);

  const isFavorite = useCallback((postId: string) => favoriteIds.has(postId), [favoriteIds]);

  const refresh = useCallback(() => {
    if (userId) void fetchFavorites(userId, { force: true });
  }, [userId, fetchFavorites]);

  return { isFavorite, toggleFavorite, favoriteIds, userId, loading: loading || authLoading, refresh };
}
