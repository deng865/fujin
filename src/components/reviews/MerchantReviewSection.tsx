import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, MessageSquare, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReviewDialog from "./ReviewDialog";
import ReviewList from "./ReviewList";

interface Props {
  postId: string;
  postUserId: string;
  currentUserId: string | null;
  isMobile: boolean;
  receiverName?: string;
}

interface ReviewStats {
  total: number;
  avg: number;
  topTags: { tag: string; count: number }[];
  verifiedCount: number;
}

export default function MerchantReviewSection({ postId, postUserId, currentUserId, isMobile, receiverName }: Props) {
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const targetType = isMobile ? "mobile_merchant" : "fixed_merchant";

  useEffect(() => {
    supabase
      .from("reviews")
      .select("rating, tags, is_verified")
      .eq("receiver_id", postUserId)
      .then(({ data }) => {
        if (!data || data.length === 0) { setStats(null); return; }
        const total = data.length;
        const sum = data.reduce((s: number, r: any) => s + r.rating, 0);
        const avg = sum / total;
        const tagMap = new Map<string, number>();
        let verified = 0;
        data.forEach((r: any) => {
          if (r.is_verified) verified++;
          (r.tags || []).forEach((t: string) => tagMap.set(t, (tagMap.get(t) || 0) + 1));
        });
        const topTags = [...tagMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([tag, count]) => ({ tag, count }));
        setStats({ total, avg, topTags, verifiedCount: verified });
      });
  }, [postUserId]);

  return (
    <div className="border border-border rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
          {isMobile ? "服务口碑" : "商家口碑"}
        </h3>
        {stats && (
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-bold">{stats.avg.toFixed(1)}</span>
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-muted-foreground text-xs">| {stats.total}条评价</span>
          </div>
        )}
      </div>

      {/* Verified count */}
      {stats && stats.verifiedCount > 0 && (
        <div className="flex items-center gap-1 text-xs text-emerald-600">
          <CheckCircle className="h-3 w-3" />
          {stats.verifiedCount} 条真实交易评价
        </div>
      )}

      {/* Tag cloud - 口碑墙 */}
      {stats && stats.topTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {stats.topTags.map((t) => (
            <span
              key={t.tag}
              className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium"
            >
              {t.tag} <span className="text-primary/60">×{t.count}</span>
            </span>
          ))}
        </div>
      )}

      {!stats && (
        <p className="text-sm text-muted-foreground text-center py-2">暂无评价，成为第一个评价的人吧</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {/* Hide "write review" button for mobile merchants — they're rated via chat after a trip */}
        {currentUserId && currentUserId !== postUserId && !isMobile && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowReviewDialog(true)}
            className="flex-1 rounded-xl text-xs"
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1" />
            写点评
          </Button>
        )}
        {stats && stats.total > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAllReviews(!showAllReviews)}
            className="flex-1 rounded-xl text-xs"
          >
            {showAllReviews ? "收起评价" : `查看全部 ${stats.total} 条`}
          </Button>
        )}
      </div>

      {/* Full review list */}
      {showAllReviews && (
        <ReviewList userId={postUserId} type="received" />
      )}

      {/* Review Dialog */}
      {currentUserId && (
        <ReviewDialog
          open={showReviewDialog}
          onOpenChange={setShowReviewDialog}
          senderId={currentUserId}
          receiverId={postUserId}
          postId={postId}
          receiverName={receiverName}
          targetType={targetType}
          onReviewSubmitted={() => {
            // Refresh stats
            supabase
              .from("reviews")
              .select("rating, tags, is_verified")
              .eq("receiver_id", postUserId)
              .then(({ data }) => {
                if (!data || data.length === 0) { setStats(null); return; }
                const total = data.length;
                const sum = data.reduce((s: number, r: any) => s + r.rating, 0);
                const tagMap = new Map<string, number>();
                let verified = 0;
                data.forEach((r: any) => {
                  if (r.is_verified) verified++;
                  (r.tags || []).forEach((t: string) => tagMap.set(t, (tagMap.get(t) || 0) + 1));
                });
                const topTags = [...tagMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([tag, count]) => ({ tag, count }));
                setStats({ total, avg: sum / total, topTags, verifiedCount: verified });
              });
          }}
        />
      )}
    </div>
  );
}
