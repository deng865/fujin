import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, ImagePlus, X, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type TargetType = "fixed_merchant" | "mobile_merchant" | "user";

const TAG_SETS: Record<TargetType, string[]> = {
  fixed_merchant: ["环境好", "味道正", "位置好找", "服务热情", "性价比高", "停车方便", "不太满意", "需要改进"],
  mobile_merchant: ["出摊准时", "位置描述准确", "回复快", "服务专业", "价格公道", "不太满意", "需要改进"],
  user: ["准时靠谱", "态度友好", "价格公道", "专业高效", "沟通顺畅", "推荐合作", "不太满意", "需要改进"],
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  senderId: string;
  receiverId: string;
  postId: string;
  receiverName?: string;
  onReviewSubmitted?: () => void;
  targetType?: TargetType;
  isVerified?: boolean;
}

export default function ReviewDialog({
  open, onOpenChange, senderId, receiverId, postId, receiverName, onReviewSubmitted,
  targetType = "user", isVerified = false,
}: Props) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const tags = TAG_SETS[targetType] || TAG_SETS.user;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (imageUrls.length + files.length > 3) {
      toast.error("最多上传3张图片");
      return;
    }
    setUploadingImage(true);
    try {
      for (const file of Array.from(files)) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { toast.error("请先登录"); return; }

        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-to-r2`,
          { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, body: formData }
        );
        const result = await res.json();
        if (result.url) {
          setImageUrls((prev) => [...prev, result.url]);
        }
      }
    } catch {
      toast.error("图片上传失败");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const removeImage = (idx: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx));
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
      post_id: postId || null,
      rating,
      comment: comment.trim() || null,
      tags: selectedTags,
      target_type: targetType,
      is_verified: isVerified,
      image_urls: imageUrls,
    } as any);

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
      setImageUrls([]);
    }
    setSubmitting(false);
  };

  const displayRating = hoverRating || rating;
  const titleMap: Record<TargetType, string> = {
    fixed_merchant: "点评商家",
    mobile_merchant: "评价服务",
    user: "评价",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center">
            {titleMap[targetType]} {receiverName || "对方"}
          </DialogTitle>
        </DialogHeader>

        {/* Verified badge */}
        {isVerified && (
          <div className="flex items-center justify-center gap-1 text-xs text-emerald-600 bg-emerald-500/10 rounded-full py-1 px-3 mx-auto w-fit">
            <CheckCircle className="h-3 w-3" />
            真实交易评价
          </div>
        )}

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
          {tags.map((tag) => (
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
          placeholder={targetType === "fixed_merchant" ? "写下你的体验（选填）" : "写一句评价（选填）"}
          maxLength={200}
          className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30 resize-none h-20"
        />

        {/* Image upload */}
        {targetType !== "user" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {imageUrls.map((url, i) => (
                <div key={i} className="relative w-16 h-16">
                  <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {imageUrls.length < 3 && (
                <label className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  {uploadingImage ? (
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  ) : (
                    <ImagePlus className="h-5 w-5 text-muted-foreground" />
                  )}
                </label>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">可上传最多3张图片</p>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={rating === 0 || submitting || uploadingImage}
          className="w-full rounded-xl"
        >
          {submitting ? "提交中..." : "提交评价"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
