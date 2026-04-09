import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const QUICK_TAGS = [
  "准时靠谱", "态度友好", "价格公道", "专业高效",
  "沟通顺畅", "推荐合作", "不太满意", "需要改进",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  senderId: string;
  receiverId: string;
  postId: string;
  receiverName?: string;
  onReviewSubmitted?: () => void;
}

export default function ReviewDialog({
  open, onOpenChange, senderId, receiverId, postId, receiverName, onReviewSubmitted,
}: Props) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) { toast.error("请选择评分"); return; }
    if (rating <= 2 && comment.trim().length < 10) {
      toast.error("低分评价请至少写10个字说明原因，以确保公正");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      sender_id: senderId,
      receiver_id: receiverId,
      post_id: postId,
      rating,
      comment: comment.trim() || null,
      tags: selectedTags,
    });

    if (error?.code === "23505") {
      toast.error("你已经评价过了");
    } else if (error) {
      toast.error("评价失败，请重试");
    } else {
      toast.success("评价已提交");
      onReviewSubmitted?.();
      onOpenChange(false);
      setRating(0);
      setComment("");
      setSelectedTags([]);
    }
    setSubmitting(false);
  };

  const displayRating = hoverRating || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center">
            评价 {receiverName || "对方"}
          </DialogTitle>
        </DialogHeader>

        {/* Stars */}
        <div className="flex justify-center gap-2 py-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-110 active:scale-95"
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  star <= displayRating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground/30"
                }`}
              />
            </button>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground">
          {displayRating === 0 && "点击星星评分"}
          {displayRating === 1 && "很差"}
          {displayRating === 2 && "较差"}
          {displayRating === 3 && "一般"}
          {displayRating === 4 && "满意"}
          {displayRating === 5 && "非常满意"}
        </p>

        {/* Quick tags */}
        <div className="flex flex-wrap gap-2 py-1">
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedTags.includes(tag)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Comment */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="写一句评价（选填）"
          maxLength={200}
          className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30 resize-none h-20"
        />

        <Button
          onClick={handleSubmit}
          disabled={rating === 0 || submitting}
          className="w-full rounded-xl"
        >
          {submitting ? "提交中..." : "提交评价"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
