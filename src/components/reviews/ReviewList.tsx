import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, AlertTriangle, User, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import DisputeDialog from "./DisputeDialog";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  tags: string[];
  created_at: string;
  dispute_status: string;
  display_name?: string;
  display_avatar?: string | null;
  is_verified?: boolean;
  image_urls?: string[];
  target_type?: string;
}

interface Props {
  userId: string;
  type?: "received" | "sent";
  canDispute?: boolean;
  targetType?: string; // filter by target_type if provided
}

const PAGE_SIZE = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

export default function ReviewList({ userId, type = "received", canDispute, targetType }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [disputeReviewId, setDisputeReviewId] = useState<string | null>(null);

  const fetchReviews = useCallback(async (pageNum: number) => {
    const col = type === "received" ? "receiver_id" : "sender_id";
    const profileCol = type === "received" ? "sender_id" : "receiver_id";
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("reviews")
      .select(`id, rating, comment, tags, created_at, dispute_status, sender_id, receiver_id, is_verified, image_urls, target_type`)
      .eq(col, userId)
      .eq("status" as any, "approved")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (targetType) {
      query = query.eq("target_type", targetType);
    }

    // 24-hour delay for received reviews
    if (type === "received") {
      const cutoff = new Date(Date.now() - DAY_MS).toISOString();
      query = query.lte("created_at", cutoff);
    }

    const { data, error } = await query;
    if (error || !data) { setLoading(false); return; }

    let enriched: Review[];
    if (type === "sent") {
      const targetIds = [...new Set(data.map((r: any) => r[profileCol]))];
      const { data: profiles } = targetIds.length > 0
        ? await supabase.from("public_profiles").select("id, name, avatar_url").in("id", targetIds)
        : { data: [] };
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      enriched = data.map((r: any) => {
        const p = profileMap.get(r[profileCol]);
        return {
          id: r.id, rating: r.rating, comment: r.comment,
          tags: r.tags || [], created_at: r.created_at,
          dispute_status: r.dispute_status,
          display_name: p?.name || "用户",
          display_avatar: p?.avatar_url,
          is_verified: r.is_verified,
          image_urls: r.image_urls || [],
          target_type: r.target_type,
        };
      });
    } else {
      // Received reviews: fetch sender credit_score and sort high-credit first
      const senderIds = [...new Set(data.map((r: any) => r.sender_id))];
      const { data: senderProfiles } = senderIds.length > 0
        ? await supabase.from("profiles").select("id, credit_score").in("id", senderIds)
        : { data: [] };
      const creditMap = new Map((senderProfiles || []).map((p: any) => [p.id, (p as any).credit_score ?? 100]));

      enriched = (data as any[])
        .map((r: any) => ({
          id: r.id, rating: r.rating, comment: r.comment,
          tags: r.tags || [], created_at: r.created_at,
          dispute_status: r.dispute_status,
          display_name: "匿名用户",
          display_avatar: null,
          is_verified: r.is_verified,
          image_urls: r.image_urls || [],
          target_type: r.target_type,
          _credit: creditMap.get(r.sender_id) ?? 100,
        }))
        .sort((a: any, b: any) => b._credit - a._credit);
    }

    if (pageNum === 0) {
      setReviews(enriched);
    } else {
      setReviews((prev) => [...prev, ...enriched]);
    }
    setHasMore(data.length === PAGE_SIZE);
    setLoading(false);
  }, [userId, type, targetType]);

  useEffect(() => {
    setPage(0);
    setReviews([]);
    setLoading(true);
    fetchReviews(0);
  }, [fetchReviews]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchReviews(next);
  };

  const handleDispute = (reviewId: string) => {
    setDisputeReviewId(reviewId);
  };

  if (loading && reviews.length === 0) {
    return <div className="py-6 text-center text-sm text-muted-foreground">加载中...</div>;
  }

  if (reviews.length === 0) {
    return <div className="py-6 text-center text-sm text-muted-foreground">暂无评价</div>;
  }

  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <div key={r.id} className="bg-card border border-border rounded-xl p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-accent overflow-hidden flex items-center justify-center">
                {r.display_avatar ? (
                  <img src={r.display_avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium">{r.display_name}</span>
                {r.is_verified && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                    <CheckCircle className="h-2.5 w-2.5" />
                    已验证
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3.5 w-3.5 ${
                    i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"
                  }`}
                />
              ))}
            </div>
          </div>
          {r.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {r.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-muted rounded-full text-[10px] text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}
          {r.comment && <p className="text-sm text-foreground">{r.comment}</p>}
          {/* Review images */}
          {r.image_urls && r.image_urls.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto">
              {r.image_urls.map((url, i) => (
                <img key={i} src={url} alt="" className="h-20 w-20 rounded-lg object-cover shrink-0" />
              ))}
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: zhCN })}
            </span>
            {r.dispute_status === "disputed" && (
              <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                <AlertTriangle className="h-3 w-3" /> 申诉中
              </span>
            )}
            {canDispute && r.dispute_status === "none" && (
              <button
                onClick={() => handleDispute(r.id)}
                className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
              >
                申诉
              </button>
            )}
          </div>
        </div>
      ))}
      {hasMore && (
        <button
          onClick={loadMore}
          className="w-full py-2 text-sm text-primary hover:underline"
        >
          加载更多
        </button>
      )}
      {disputeReviewId && (
        <DisputeDialog
          open={!!disputeReviewId}
          onOpenChange={(o) => !o && setDisputeReviewId(null)}
          reviewId={disputeReviewId}
          onDisputed={() => {
            setReviews((prev) =>
              prev.map((r) => r.id === disputeReviewId ? { ...r, dispute_status: "disputed" } : r),
            );
            setDisputeReviewId(null);
          }}
        />
      )}
    </div>
  );
}
