
import { useState, useRef } from "react";
import { Camera, X, Play, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MediaUploadProps {
  mediaUrls: string[];
  onChange: (urls: string[]) => void;
}

async function compressImage(file: File, maxWidth = 1080, quality = 0.72): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = (maxWidth / w) * h; w = maxWidth; }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          resolve(blob ? new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }) : file);
        },
        "image/jpeg", quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}

export default function MediaUpload({ mediaUrls, onChange }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("请先登录");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const endpoint = `https://${projectId}.supabase.co/functions/v1/upload-to-r2`;

      // Filter out oversized files first
      const validFiles = Array.from(files).filter((file) => {
        if (file.size > 50 * 1024 * 1024) {
          toast.error(`${file.name} 超过50MB限制`);
          return false;
        }
        return true;
      });

      // Compress + upload all files in PARALLEL for much faster experience
      const uploadOne = async (file: File): Promise<string | null> => {
        try {
          const processedFile = await compressImage(file);
          const formData = new FormData();
          formData.append("file", processedFile);
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: formData,
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: "上传失败" }));
            toast.error(err.error || `上传失败: ${file.name}`);
            return null;
          }
          const { url } = await res.json();
          return url as string;
        } catch (err: any) {
          toast.error(err?.message || `上传失败: ${file.name}`);
          return null;
        }
      };

      const results = await Promise.all(validFiles.map(uploadOne));
      const newUrls = results.filter((u): u is string => !!u);

      if (newUrls.length > 0) {
        onChange([...mediaUrls, ...newUrls]);
      }
    } catch (err: any) {
      toast.error(err.message || "上传失败");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeMedia = (index: number) => {
    onChange(mediaUrls.filter((_, i) => i !== index));
  };

  const isVideo = (url: string) => /\.(mp4|mov|webm)(\?|$)/i.test(url);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold text-muted-foreground">
        图片/视频 Photos/Videos
      </Label>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {mediaUrls.map((url, i) => (
          <div key={i} className="relative shrink-0">
            {isVideo(url) ? (
              <div className="h-20 w-20 rounded-xl border-2 border-border/50 bg-muted flex items-center justify-center">
                <Play className="h-6 w-6 text-muted-foreground" />
              </div>
            ) : (
              <img
                src={url}
                alt=""
                className="h-20 w-20 object-cover rounded-xl border-2 border-border/50"
              />
            )}
            <button
              onClick={() => removeMedia(i)}
              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="h-20 w-20 shrink-0 rounded-xl border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Camera className="h-5 w-5" />
              <span className="text-[10px]">添加</span>
            </>
          )}
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/mp4,video/quicktime"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
