import { useState, useEffect, useRef, useCallback } from "react";
import { Radio, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LiveLocationBannerProps {
  conversationId: string;
  userId: string;
  durationMinutes: number;
  startedAt: number; // timestamp ms
  onStop: () => void;
}

export default function LiveLocationBanner({
  conversationId,
  userId,
  durationMinutes,
  startedAt,
  onStop,
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

  // Watch position and broadcast
  useEffect(() => {
    channelRef.current = supabase.channel(`live-loc-${conversationId}`);
    channelRef.current.subscribe();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        channelRef.current?.send({
          type: "broadcast",
          event: "live-location",
          payload: {
            userId,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            timestamp: Date.now(),
          },
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (channelRef.current) {
        // Send stop signal
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
      <button
        onClick={onStop}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 transition-colors hover:bg-green-500/20"
      >
        <Radio className="h-4 w-4 text-green-500 animate-pulse" />
        <span className="text-sm font-medium text-green-600 dark:text-green-400">
          正在共享位置 · {remaining}
        </span>
        <span className="text-xs text-green-500 ml-1">点击停止</span>
      </button>
    </div>
  );
}
