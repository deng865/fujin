import { useState, useEffect, useRef, useCallback } from "react";
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface VoiceCallProps {
  conversationId: string;
  callSessionId: string;
  userId: string;
  userName: string;
  otherUserName: string;
  isCaller: boolean;
  onClose: (duration?: number) => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function VoiceCall({
  conversationId,
  callSessionId,
  userId,
  userName,
  otherUserName,
  isCaller,
  onClose,
}: VoiceCallProps) {
  const [status, setStatus] = useState<"ringing" | "connecting" | "connected" | "ended">(
    isCaller ? "ringing" : "connecting"
  );
  const [muted, setMuted] = useState(false);
  const [speakerOff, setSpeakerOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const channelRef = useRef<any>(null);
  const ringCtxRef = useRef<AudioContext | null>(null);
  const ringPlayingRef = useRef(true);
  const statusRef = useRef(status);
  statusRef.current = status;

  const cleanup = useCallback(() => {
    clearInterval(timerRef.current);
    ringPlayingRef.current = false;
    ringCtxRef.current?.close().catch(() => {});
    ringCtxRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current = null;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  // Dialing tone for caller
  useEffect(() => {
    if (!isCaller || status !== "ringing") return;
    const ctx = new AudioContext();
    ringCtxRef.current = ctx;
    ringPlayingRef.current = true;

    const playRing = async () => {
      while (ringPlayingRef.current) {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 440;
          gain.gain.value = 0.08;
          osc.start();
          osc.stop(ctx.currentTime + 0.8);
          await new Promise((r) => setTimeout(r, 3000));
        } catch {
          break;
        }
      }
    };
    playRing();

    return () => {
      ringPlayingRef.current = false;
      ctx.close().catch(() => {});
    };
  }, [isCaller, status]);

  // Auto-cancel: caller waits 30s, then marks session as missed
  useEffect(() => {
    if (!isCaller || status !== "ringing") return;
    const timer = setTimeout(async () => {
      if (statusRef.current === "ringing") {
        await supabase.from("call_sessions").update({ status: "missed", ended_at: new Date().toISOString() } as any).eq("id", callSessionId);
        setStatus("ended");
        cleanup();
        onClose(undefined);
      }
    }, 30000);
    return () => clearTimeout(timer);
  }, [isCaller, status, callSessionId, cleanup, onClose]);

  // Watch call_session status changes (for caller: detect answered/ended; for callee: detect ended)
  useEffect(() => {
    const ch = supabase.channel(`call-session-watch-${callSessionId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "call_sessions",
        filter: `id=eq.${callSessionId}`,
      }, (payload) => {
        const newStatus = (payload.new as any).status;
        if (newStatus === "ended" || newStatus === "missed") {
          if (statusRef.current !== "ended") {
            setStatus("ended");
            cleanup();
            toast({ title: "通话已结束", description: "对方已挂断" });
            setTimeout(() => onClose(duration > 0 ? duration : undefined), 500);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [callSessionId, cleanup, onClose, duration]);

  // Main WebRTC setup
  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          if (remoteAudioRef.current && event.streams[0]) {
            remoteAudioRef.current.srcObject = event.streams[0];
          }
        };

        pc.onconnectionstatechange = () => {
          const state = pc.connectionState;
          if (state === "connected") {
            ringPlayingRef.current = false;
            ringCtxRef.current?.close().catch(() => {});
            setStatus("connected");
            timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
          } else if (state === "disconnected" || state === "failed") {
            setStatus("ended");
            cleanup();
          }
        };

        // Signaling channel using callSessionId for uniqueness
        const channelName = `call-signal-${callSessionId}`;
        const channel = supabase.channel(channelName);
        channelRef.current = channel;

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
            if (payload.from === userId || !pcRef.current) return;
            try {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
              const answer = await pcRef.current.createAnswer();
              await pcRef.current.setLocalDescription(answer);
              channel.send({
                type: "broadcast",
                event: "answer",
                payload: { sdp: answer, from: userId },
              });
            } catch (err) {
              console.error("Error handling offer:", err);
            }
          })
          .on("broadcast", { event: "answer" }, async ({ payload }) => {
            if (payload.from === userId || !pcRef.current) return;
            try {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
              setStatus("connecting");
            } catch (err) {
              console.error("Error handling answer:", err);
            }
          })
          .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
            if (payload.from === userId || !pcRef.current) return;
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch {}
          })
          .on("broadcast", { event: "hangup" }, ({ payload }) => {
            if (payload.from !== userId) {
              setStatus("ended");
              cleanup();
              toast({ title: "通话已结束", description: "对方已挂断" });
              setTimeout(() => onClose(duration > 0 ? duration : undefined), 500);
            }
          })
          .subscribe(async (subStatus) => {
            if (subStatus !== "SUBSCRIBED" || cancelled) return;

            if (isCaller) {
              // Create and send offer
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              channel.send({
                type: "broadcast",
                event: "offer",
                payload: { sdp: offer, from: userId },
              });
            }
            // Callee waits for offer via broadcast above
          });

      } catch (err: any) {
        if (!cancelled) {
          toast({
            title: "通话失败",
            description: err.message?.includes("Permission") ? "请允许麦克风权限后重试" : (err.message || "无法建立连接"),
            variant: "destructive",
          });
          setStatus("ended");
          cleanup();
          // Mark session as ended
          await supabase.from("call_sessions").update({ status: "ended", ended_at: new Date().toISOString() } as any).eq("id", callSessionId);
          setTimeout(() => onClose(undefined), 500);
        }
      }
    };

    setup();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [callSessionId, userId, isCaller, cleanup, onClose]);

  const hangup = async () => {
    channelRef.current?.send({
      type: "broadcast",
      event: "hangup",
      payload: { from: userId },
    });
    setStatus("ended");
    const finalDuration = duration;
    cleanup();
    await supabase.from("call_sessions").update({ status: "ended", ended_at: new Date().toISOString() } as any).eq("id", callSessionId);
    setTimeout(() => onClose(finalDuration > 0 ? finalDuration : undefined), 500);
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
          <Phone className={`h-8 w-8 text-primary ${status === "ringing" ? "animate-pulse" : ""}`} />
        </div>
        <h2 className="text-xl font-semibold">{otherUserName}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {status === "ringing" && "正在呼叫..."}
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
          disabled={status !== "connected"}
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
          disabled={status !== "connected"}
        >
          {speakerOff ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
        </Button>
      </div>
    </div>
  );
}
