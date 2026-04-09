import { useState, useRef, useCallback } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface VoiceRecorderProps {
  conversationId: string;
  userId: string;
  disabled?: boolean;
}

export default function VoiceRecorder({ conversationId, userId, disabled }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const startTimeRef = useRef<number>(0);

  const getSupportedMimeType = useCallback(() => {
    const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg", "audio/wav"];
    for (const t of types) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
    }
    return "";
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const permResult = await navigator.permissions.query({ name: "microphone" as PermissionName });
      if (permResult.state === "denied") {
        toast({ title: "麦克风权限被拒绝", description: "请在系统设置中允许本应用使用麦克风", variant: "destructive" });
        return;
      }
    } catch {
      // permissions.query not supported (e.g. Safari), continue to getUserMedia
    }

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: any) {
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        toast({ title: "麦克风权限被拒绝", description: "请在系统设置中允许本应用使用麦克风", variant: "destructive" });
      } else if (name === "NotFoundError") {
        toast({ title: "未检测到麦克风", description: "请确认设备已连接麦克风", variant: "destructive" });
      } else if (name === "NotReadableError") {
        toast({ title: "麦克风被占用", description: "请关闭其他正在使用麦克风的应用", variant: "destructive" });
      } else {
        toast({ title: "无法录音", description: err?.message || "未知错误", variant: "destructive" });
      }
      return;
    }

    try {
      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream!.getTracks().forEach((t) => t.stop());
        clearInterval(timerRef.current);
        const finalDuration = Math.round((Date.now() - startTimeRef.current) / 1000);

        if (chunksRef.current.length === 0 || finalDuration < 1) {
          setRecording(false);
          return;
        }

        const actualMime = mediaRecorder.mimeType || mimeType || "audio/webm";
        const ext = actualMime.includes("mp4") ? "m4a" : actualMime.includes("ogg") ? "ogg" : "webm";
        const blob = new Blob(chunksRef.current, { type: actualMime });
        setUploading(true);
        setRecording(false);

        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("请先登录");

          const formData = new FormData();
          formData.append("file", new File([blob], `voice_${Date.now()}.${ext}`, { type: actualMime }));

          const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
          const res = await fetch(
            `https://${projectId}.supabase.co/functions/v1/upload-to-r2`,
            { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, body: formData }
          );

          if (!res.ok) throw new Error("上传失败");
          const { url } = await res.json();

          const voiceContent = JSON.stringify({ type: "voice", url, duration: finalDuration });
          const { error } = await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender_id: userId,
            content: voiceContent,
          });

          if (error) throw error;

          await supabase
            .from("conversations")
            .update({ last_message: "🎤 语音消息", updated_at: new Date().toISOString() })
            .eq("id", conversationId);
        } catch (err: any) {
          toast({ title: "发送语音失败", description: err.message || "请稍后重试", variant: "destructive" });
        } finally {
          setUploading(false);
          setDuration(0);
        }
      };

      mediaRecorder.start(200);
      startTimeRef.current = Date.now();
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration(Math.round((Date.now() - startTimeRef.current) / 1000));
      }, 500);
    } catch (err: any) {
      stream.getTracks().forEach((t) => t.stop());
      toast({ title: "录音初始化失败", description: err?.message || "当前浏览器可能不支持录音", variant: "destructive" });
    }
  }, [conversationId, userId, getSupportedMimeType]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, "0")}` : `0:${sec.toString().padStart(2, "0")}`;
  };

  if (uploading) {
    return (
      <div className="flex items-center gap-2 shrink-0 px-2 py-1 rounded-full bg-muted">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">发送中...</span>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="flex items-center gap-2 shrink-0 pl-3 pr-1 py-1 rounded-full bg-destructive/10 border border-destructive/20">
        <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
        <span className="text-xs text-destructive font-mono font-medium min-w-[36px]">
          {formatDuration(duration)}
        </span>
        <button
          onClick={stopRecording}
          className="h-8 w-8 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          title="停止录音"
        >
          <Square className="h-3.5 w-3.5 fill-current" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startRecording}
      disabled={disabled}
      className="p-2.5 hover:bg-accent rounded-full text-muted-foreground hover:text-primary transition-colors shrink-0 disabled:opacity-50"
      title="发送语音"
    >
      <Mic className="h-5 w-5" />
    </button>
  );
}
