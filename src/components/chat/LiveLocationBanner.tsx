import { useState, useEffect, useRef } from "react";
import { Radio, StopCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LiveLocationBannerProps {
  conversationId: string;
  userId: string;
  durationMinutes: number;
  startedAt: number;
  onStop: () => void;
  onPositionUpdate?: (pos: { lat: number; lng: number }) => void;
}

export default function LiveLocationBanner({
  conversationId,
  userId,
  durationMinutes,
  startedAt,
  onStop,
  onPositionUpdate,
}: LiveLocationBannerProps) {
  const [remaining, setRemaining] = useState("");
  const watchIdRef = useRef<number | null>(null);
  const channelRef = useRef<any>(null);

  // Countdown timer
  useEffect(() => {
    const endTime = startedAt + durationMinutes * 60 * 1000;
    const tick = () => {
      const left = endTime - Date.now();
      if (left <= 0) {
        onStop();
        return;
      }
      const min = Math.floor(left / 60000);
      const sec = Math.floor((left % 60000) / 1000);
      setRemaining(`${min}:${sec.toString().padStart(2, "0")}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt, durationMinutes, onStop]);

  // Watch position and broadcast — wait for SUBSCRIBED before starting GPS
  useEffect(() => {
    const ch = supabase.channel(`live-loc-${conversationId}`);
    channelRef.current = ch;

    ch.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            onPositionUpdate?.(coords);
            ch.send({
              type: "broadcast",
              event: "live-location",
              payload: {
                userId,
                lat: coords.lat,
                lng: coords.lng,
                timestamp: Date.now(),
              },
            });
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
        );
      }
    });

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "live-location-stop",
          payload: { userId },
        });
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [conversationId, userId]);

  return (
    <div className="shrink-0 bg-green-500/10 border-b border-green-500/20 max-w-lg mx-auto w-full">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Radio className="h-4 w-4 text-green-500 animate-pulse shrink-0" />
          <span className="text-sm font-medium text-green-600 dark:text-green-400 truncate">
            正在共享位置 · {remaining}
          </span>
        </div>
        <button
          onClick={onStop}
          className="ml-3 px-4 py-1.5 bg-destructive text-destructive-foreground rounded-full text-xs font-semibold hover:bg-destructive/90 transition-colors shrink-0 flex items-center gap-1.5"
        >
          <StopCircle className="h-3.5 w-3.5" />
          结束共享
        </button>
      </div>
    </div>
  );
}
