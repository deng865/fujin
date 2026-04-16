import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string;
  onDisputed?: () => void;
}

export default function DisputeDialog({ open, onOpenChange, reviewId, onDisputed }: Props) {
  const [reason, setReason] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (imageUrls.length + files.length > 3) {
      toast.error("最多上传3张证据图片");
      return;
    }
    setUploading(true);
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
        if (result.url) setImageUrls((prev) => [...prev, result.url]);
      }
    } catch {
      toast.error("图片上传失败");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (idx: number) => setImageUrls((p) => p.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    const trimmed = reason.trim();
    if (trimmed.length < 10) { toast.error("请输入至少10个字的申诉理由"); return; }
    if (trimmed.length > 500) { toast.error("申诉理由不超过500字"); return; }
    setSubmitting(true);
    const { error } = await supabase
      .from("reviews")
      .update({
        dispute_status: "disputed",
        dispute_reason: trimmed,
        dispute_images: imageUrls,
      } as any)
      .eq("id", reviewId);
    setSubmitting(false);
    if (error) {
      toast.error("申诉提交失败，请稍后重试");
      return;
    }
    toast.success("申诉已提交，管理员将尽快处理");
    onDisputed?.();
    onOpenChange(false);
    setReason("");
    setImageUrls([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            申诉评价
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">申诉理由（10-500字）</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请客观说明此评价存在的问题，例如恶意诋毁、虚假信息等..."
              maxLength={500}
              className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30 resize-none h-28"
            />
            <p className="text-[10px] text-muted-foreground text-right mt-1">{reason.length}/500</p>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">证据图片（选填，最多3张）</label>
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
                  {uploading ? (
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  ) : (
                    <ImagePlus className="h-5 w-5 text-muted-foreground" />
                  )}
                </label>
              )}
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || uploading || reason.trim().length < 10}
            className="w-full rounded-xl"
          >
            {submitting ? "提交中..." : "提交申诉"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
