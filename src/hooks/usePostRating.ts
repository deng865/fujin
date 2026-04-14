import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PostRating {
  avgRating: number;
  totalReviews: number;
  topTag: string | null;
}

const cache = new Map<string, PostRating>();

export function usePostRating(postId: string | undefined) {
  const [data, setData] = useState<PostRating>({ avgRating: 0, totalReviews: 0, topTag: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!postId) { setLoading(false); return; }
    if (cache.has(postId)) {
      setData(cache.get(postId)!);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data: reviews } = await supabase
        .from("reviews")
        .select("rating, tags")
        .eq("post_id", postId);

      if (cancelled) return;

      if (!reviews || reviews.length === 0) {
        const result = { avgRating: 0, totalReviews: 0, topTag: null };
        cache.set(postId, result);
        setData(result);
        setLoading(false);
        return;
      }

      const total = reviews.length;
      const avg = reviews.reduce((s, r) => s + r.rating, 0) / total;

      // Find most frequent tag
      const tagCount: Record<string, number> = {};
      reviews.forEach(r => {
        (r.tags || []).forEach((t: string) => {
          tagCount[t] = (tagCount[t] || 0) + 1;
        });
      });
      const topTag = Object.entries(tagCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      const result = { avgRating: Math.round(avg * 10) / 10, totalReviews: total, topTag };
      cache.set(postId, result);
      setData(result);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [postId]);

  return { ...data, loading };
}

// Batch version for lists - fetches all at once
export function usePostRatings(postIds: string[]) {
  const [ratings, setRatings] = useState<Record<string, PostRating>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (postIds.length === 0) { setLoading(false); return; }

    // Check which ones we already have cached
    const needed: string[] = [];
    const cached: Record<string, PostRating> = {};
    postIds.forEach(id => {
      if (cache.has(id)) cached[id] = cache.get(id)!;
      else needed.push(id);
    });

    if (needed.length === 0) {
      setRatings(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data: reviews } = await supabase
        .from("reviews")
        .select("rating, tags, post_id")
        .in("post_id", needed);

      if (cancelled) return;

      // Group by post_id
      const grouped: Record<string, typeof reviews> = {};
      needed.forEach(id => { grouped[id] = []; });
      (reviews || []).forEach(r => {
        if (r.post_id) {
          if (!grouped[r.post_id]) grouped[r.post_id] = [];
          grouped[r.post_id]!.push(r);
        }
      });

      const result: Record<string, PostRating> = { ...cached };
      Object.entries(grouped).forEach(([pid, revs]) => {
        if (revs!.length === 0) {
          const r = { avgRating: 0, totalReviews: 0, topTag: null };
          cache.set(pid, r);
          result[pid] = r;
        } else {
          const total = revs!.length;
          const avg = revs!.reduce((s, r) => s + r.rating, 0) / total;
          const tagCount: Record<string, number> = {};
          revs!.forEach(r => {
            (r.tags || []).forEach((t: string) => {
              tagCount[t] = (tagCount[t] || 0) + 1;
            });
          });
          const topTag = Object.entries(tagCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
          const r = { avgRating: Math.round(avg * 10) / 10, totalReviews: total, topTag };
          cache.set(pid, r);
          result[pid] = r;
        }
      });

      setRatings(result);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [postIds.join(",")]);

  return { ratings, loading };
}
