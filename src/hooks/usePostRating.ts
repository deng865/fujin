import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PostRating {
  avgRating: number;
  totalReviews: number;
  topTag: string | null;
}

const cache = new Map<string, PostRating>();

function cacheKey(postId: string, userId?: string) {
  return userId ? `${postId}:${userId}` : postId;
}

function computeRating(reviews: { rating: number; tags: string[] | null }[]): PostRating {
  if (!reviews || reviews.length === 0) {
    return { avgRating: 0, totalReviews: 0, topTag: null };
  }
  const total = reviews.length;
  const avg = reviews.reduce((s, r) => s + r.rating, 0) / total;
  const tagCount: Record<string, number> = {};
  reviews.forEach(r => {
    (r.tags || []).forEach((t: string) => {
      tagCount[t] = (tagCount[t] || 0) + 1;
    });
  });
  const topTag = Object.entries(tagCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  return { avgRating: Math.round(avg * 10) / 10, totalReviews: total, topTag };
}

export function usePostRating(postId: string | undefined, userId?: string) {
  const [data, setData] = useState<PostRating>({ avgRating: 0, totalReviews: 0, topTag: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!postId) { setLoading(false); return; }
    const key = cacheKey(postId, userId);
    if (cache.has(key)) {
      setData(cache.get(key)!);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      // Query by post_id
      const { data: postReviews } = await supabase
        .from("reviews")
        .select("id, rating, tags")
        .eq("post_id", postId);

      // Also query by receiver_id (the post owner) if userId provided
      let receiverReviews: typeof postReviews = [];
      if (userId) {
        const { data: rr } = await supabase
          .from("reviews")
          .select("id, rating, tags")
          .eq("receiver_id", userId);
        receiverReviews = rr || [];
      }

      if (cancelled) return;

      // Merge and deduplicate by review id
      const seen = new Set<string>();
      const merged: { rating: number; tags: string[] | null }[] = [];
      [...(postReviews || []), ...receiverReviews].forEach(r => {
        if (!seen.has(r.id)) {
          seen.add(r.id);
          merged.push({ rating: r.rating, tags: r.tags });
        }
      });

      const result = computeRating(merged);
      cache.set(key, result);
      setData(result);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [postId, userId]);

  return { ...data, loading };
}

export interface PostRatingInput {
  postId: string;
  userId?: string;
}

// Batch version for lists - fetches all at once
export function usePostRatings(inputs: PostRatingInput[]) {
  const [ratings, setRatings] = useState<Record<string, PostRating>>({});
  const [loading, setLoading] = useState(true);

  const stableKey = inputs.map(i => `${i.postId}:${i.userId || ""}`).join(",");

  useEffect(() => {
    if (inputs.length === 0) { setLoading(false); return; }

    // Check cache
    const needed: PostRatingInput[] = [];
    const cached: Record<string, PostRating> = {};
    inputs.forEach(({ postId, userId }) => {
      const key = cacheKey(postId, userId);
      if (cache.has(key)) cached[postId] = cache.get(key)!;
      else needed.push({ postId, userId });
    });

    if (needed.length === 0) {
      setRatings(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const postIds = needed.map(n => n.postId);
      const userIds = [...new Set(needed.filter(n => n.userId).map(n => n.userId!))];

      // Fetch reviews by post_id
      const { data: byPost } = await supabase
        .from("reviews")
        .select("id, rating, tags, post_id, receiver_id")
        .in("post_id", postIds);

      // Fetch reviews by receiver_id
      let byReceiver: typeof byPost = [];
      if (userIds.length > 0) {
        const { data: rr } = await supabase
          .from("reviews")
          .select("id, rating, tags, post_id, receiver_id")
          .in("receiver_id", userIds);
        byReceiver = rr || [];
      }

      if (cancelled) return;

      // Build a map: postId -> deduplicated reviews
      const grouped: Record<string, Map<string, { rating: number; tags: string[] | null }>> = {};
      needed.forEach(({ postId }) => { grouped[postId] = new Map(); });

      // Add post_id-matched reviews
      (byPost || []).forEach(r => {
        if (r.post_id && grouped[r.post_id]) {
          grouped[r.post_id].set(r.id, { rating: r.rating, tags: r.tags });
        }
      });

      // Add receiver_id-matched reviews (map back to postId via userId)
      const userToPostIds: Record<string, string[]> = {};
      needed.forEach(({ postId, userId }) => {
        if (userId) {
          if (!userToPostIds[userId]) userToPostIds[userId] = [];
          userToPostIds[userId].push(postId);
        }
      });

      (byReceiver || []).forEach(r => {
        if (r.receiver_id && userToPostIds[r.receiver_id]) {
          userToPostIds[r.receiver_id].forEach(pid => {
            if (grouped[pid] && !grouped[pid].has(r.id)) {
              grouped[pid].set(r.id, { rating: r.rating, tags: r.tags });
            }
          });
        }
      });

      const result: Record<string, PostRating> = { ...cached };
      Object.entries(grouped).forEach(([pid, reviewMap]) => {
        const reviews = Array.from(reviewMap.values());
        const r = computeRating(reviews);
        const input = needed.find(n => n.postId === pid);
        cache.set(cacheKey(pid, input?.userId), r);
        result[pid] = r;
      });

      setRatings(result);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [stableKey]);

  return { ratings, loading };
}
