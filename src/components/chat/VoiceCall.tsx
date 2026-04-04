import { useState, useEffect, useRef, useCallback } from "react";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface VoiceCallProps {
  conversationId: string;
  userId: string;
  userName: string;
  otherUserName: string;
  onClose: () => void;
}

export default function VoiceCall({
  conversationId,
  userId,
  userName,
  otherUserName,
  onClose,
}: VoiceCallProps) {
  const [status, setStatus] = useState<"connecting" | "connected" | "ended">("connecting");
  const [muted, setMuted] = useState(false);
  const [speakerOff, setSpeakerOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const wsRef = useRef<WebSocket | null>(null);

  const cleanup = useCallback(() => {
    clearInterval(timerRef.current);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    wsRef.current?.close();
    pcRef.current = null;
    localStreamRef.current = null;
    wsRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const startCall = async () => {
      try {
        // Get LiveKit token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("请先登录");

        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/generate-livekit-token`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              roomName: conversationId,
              participantName: userName || userId,
              roomType: "conversation",
            }),
          }
        );

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "获取通话凭证失败");
        }

        const { token, url } = await res.json();
        if (cancelled) return;

        // Connect to LiveKit via WebSocket
        const wsUrl = url.replace(/^https?:\/\//, "wss://") + `/rtc?access_token=${token}`;
        
        // Get microphone
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;

        // Create peer connection
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pcRef.current = pc;

        // Add local audio track
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // Handle remote audio
        pc.ontrack = (event) => {
          if (remoteAudioRef.current && event.streams[0]) {
            remoteAudioRef.current.srcObject = event.streams[0];
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "connected") {
            setStatus("connected");
            timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
          } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
            setStatus("ended");
            cleanup();
          }
        };

        // For now, use a simpler approach - just establish the audio stream
        // and signal via Supabase Realtime
        const channel = supabase.channel(`call-${conversationId}`);
        
        pc.onicecandidate = (e) => {
          if (e.candidate) {
            channel.send({
              type: "broadcast",
              event: "ice-candidate",
              payload: { candidate: e.candidate.toJSON(), from: userId },
            });
          }
        };

        channel
          .on("broadcast", { event: "offer" }, async ({ payload }) => {
            if (payload.from === userId) return;
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            channel.send({
              type: "broadcast",
              event: "answer",
              payload: { sdp: answer, from: userId },
            });
          })
          .on("broadcast", { event: "answer" }, async ({ payload }) => {
            if (payload.from === userId) return;
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          })
          .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
            if (payload.from === userId) return;
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch {}
          })
          .on("broadcast", { event: "hangup" }, ({ payload }) => {
            if (payload.from !== userId) {
              setStatus("ended");
              cleanup();
              toast({ title: "通话已结束", description: "对方已挂断" });
            }
          })
          .subscribe(async (subStatus) => {
            if (subStatus === "SUBSCRIBED") {
              // Notify the other user about incoming call
              channel.send({
                type: "broadcast",
                event: "call-invite",
                payload: { from: userId, callerName: userName },
              });

              // Create and send offer
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              channel.send({
                type: "broadcast",
                event: "offer",
                payload: { sdp: offer, from: userId },
              });
              setStatus("connected");
              timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
            }
          });

        // Store channel ref for cleanup
        (pcRef.current as any).__channel = channel;

      } catch (err: any) {
        if (!cancelled) {
          toast({ title: "通话失败", description: err.message || "无法建立连接", variant: "destructive" });
          setStatus("ended");
          cleanup();
        }
      }
    };

    startCall();
    return () => { cancelled = true; cleanup(); };
  }, [conversationId, userId, userName, cleanup]);

  const hangup = () => {
    const channel = (pcRef.current as any)?.__channel;
    channel?.send({
      type: "broadcast",
      event: "hangup",
      payload: { from: userId },
    });
    setStatus("ended");
    cleanup();
    setTimeout(onClose, 500);
  };

  const toggleMute = () => {
    const tracks = localStreamRef.current?.getAudioTracks();
    if (tracks) {
      tracks.forEach((t) => (t.enabled = muted));
      setMuted(!muted);
    }
  };

  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !speakerOff;
      setSpeakerOff(!speakerOff);
    }
  };

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center">
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="text-center mb-12">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Phone className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">{otherUserName}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {status === "connecting" && "正在连接..."}
          {status === "connected" && formatDuration(duration)}
          {status === "ended" && "通话已结束"}
        </p>
      </div>

      <div className="flex items-center gap-6">
        <Button
          variant="outline"
          size="icon"
          className="h-14 w-14 rounded-full"
          onClick={toggleMute}
        >
          {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>

        <Button
          variant="destructive"
          size="icon"
          className="h-16 w-16 rounded-full"
          onClick={hangup}
        >
          <PhoneOff className="h-7 w-7" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="h-14 w-14 rounded-full"
          onClick={toggleSpeaker}
        >
          {speakerOff ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
        </Button>
      </div>
    </div>
  );
}
