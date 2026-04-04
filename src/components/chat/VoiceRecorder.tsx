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

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(timerRef.current);
        const finalDuration = Math.round((Date.now() - startTimeRef.current) / 1000);

        if (chunksRef.current.length === 0 || finalDuration < 1) {
          setRecording(false);
          return;
        }

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setUploading(true);
        setRecording(false);

        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("请先登录");

          const formData = new FormData();
          formData.append("file", new File([blob], `voice_${Date.now()}.webm`, { type: "audio/webm" }));

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
    } catch {
      toast({ title: "无法录音", description: "请确保已授予麦克风权限", variant: "destructive" });
    }
  }, [conversationId, userId]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  if (uploading) {
    return (
      <button disabled className="p-2.5 rounded-full text-muted-foreground shrink-0">
        <Loader2 className="h-5 w-5 animate-spin" />
      </button>
    );
  }

  if (recording) {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-destructive font-medium animate-pulse">{duration}″</span>
        <button
          onClick={stopRecording}
          className="p-2.5 hover:bg-destructive/10 rounded-full text-destructive transition-colors"
          title="停止录音"
        >
          <Square className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startRecording}
      disabled={disabled}
      className="p-2.5 hover:bg-accent rounded-full text-muted-foreground hover:text-primary transition-colors shrink-0"
      title="发送语音"
    >
      <Mic className="h-5 w-5" />
    </button>
  );
}
