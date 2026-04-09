import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Radio, StopCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  hasMeaningfulPositionChange,
  LIVE_LOCATION_HEARTBEAT_MS,
  LiveLocationPosition,
} from "@/lib/liveLocation";

interface LiveLocationBannerProps {
  conversationId: string;
  userId: string;
  otherUserId?: string;
  durationMinutes: number;
  startedAt: number;
  onStop: (reason: "manual" | "expired") => void | Promise<void>;
  onPositionUpdate?: (pos: { lat: number; lng: number }) => void;
  onOtherPositionUpdate?: (pos: { lat: number; lng: number }) => void;
  onError?: (message: string | null) => void;
  /** Expose the Supabase channel ref so sibling components (e.g. LiveLocationMap) can attach listeners */
  channelRef?: React.MutableRefObject<any>;
}

export default function LiveLocationBanner({
  conversationId,
  userId,
  otherUserId,
  durationMinutes,
  startedAt,
  onStop,
  onPositionUpdate,
  onOtherPositionUpdate,
  onError,
  channelRef: externalChannelRef,
}: LiveLocationBannerProps) {
  const [remaining, setRemaining] = useState("");
  const [isStopping, setIsStopping] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const channelRef = useRef<any>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestCoordsRef = useRef<LiveLocationPosition | null>(null);
  const lastBroadcastRef = useRef<LiveLocationPosition | null>(null);
  const lastBroadcastAtRef = useRef(0);
  const watchStartedRef = useRef(false);
  const stopTriggeredRef = useRef(false);

  // Store callbacks in ref to avoid effect re-runs
  const callbacksRef = useRef({ onPositionUpdate, onOtherPositionUpdate, onError, otherUserId });
  useEffect(() => {
    callbacksRef.current = { onPositionUpdate, onOtherPositionUpdate, onError, otherUserId };
  });

  const broadcastPosition = useCallback((coords: LiveLocationPosition, force = false) => {
    latestCoordsRef.current = coords;
    callbacksRef.current.onPositionUpdate?.(coords);
    callbacksRef.current.onError?.(null);

    const channel = channelRef.current;
    if (!channel) return;

    const now = Date.now();
    const movedEnough = hasMeaningfulPositionChange(lastBroadcastRef.current, coords);
    const heartbeatElapsed = now - lastBroadcastAtRef.current >= LIVE_LOCATION_HEARTBEAT_MS;

    if (!force && !movedEnough && !heartbeatElapsed) return;

    lastBroadcastRef.current = coords;
    lastBroadcastAtRef.current = now;

    void channel.send({
      type: "broadcast",
      event: "live-location",
      payload: {
        userId,
        lat: coords.lat,
        lng: coords.lng,
        timestamp: now,
      },
    });
  }, [userId]);

  const handleStop = useCallback(async (reason: "manual" | "expired") => {
    if (stopTriggeredRef.current) return;
    stopTriggeredRef.current = true;
    setIsStopping(true);

    try {
      await onStop(reason);
    } catch {
      stopTriggeredRef.current = false;
      setIsStopping(false);
    }
  }, [onStop]);

  // Countdown timer
  useEffect(() => {
    const endTime = startedAt + durationMinutes * 60 * 1000;
    const tick = () => {
      const left = endTime - Date.now();
      if (left <= 0) {
        void handleStop("expired");
        return;
      }
      const min = Math.floor(left / 60000);
      const sec = Math.floor((left % 60000) / 1000);
      setRemaining(`${min}:${sec.toString().padStart(2, "0")}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [durationMinutes, handleStop, startedAt]);

  // Watch position and broadcast — stable deps only
  useEffect(() => {
    const ch = supabase.channel(`live-loc-${conversationId}`);
    channelRef.current = ch;

    const handleGeoError = (error: GeolocationPositionError) => {
      if (error.code === 1) callbacksRef.current.onError?.("定位权限被拒绝");
      else if (error.code === 2) callbacksRef.current.onError?.("定位不可用");
      else if (error.code === 3) callbacksRef.current.onError?.("定位超时");
      else callbacksRef.current.onError?.("无法获取定位");
    };

    const handleGeoSuccess = (pos: GeolocationPosition) => {
      broadcastPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    };

    ch.on("broadcast", { event: "live-location" }, (msg: any) => {
      const p = msg?.payload;
      if (!p || typeof p.lat !== "number" || typeof p.lng !== "number") return;
      const { otherUserId: oid, onOtherPositionUpdate: cb } = callbacksRef.current;
      if (oid && p.userId === oid) {
        cb?.({ lat: p.lat, lng: p.lng });
      }
    });

    ch.subscribe((status: string) => {
      if (status === "SUBSCRIBED" && !watchStartedRef.current) {
        watchStartedRef.current = true;

        if (!navigator.geolocation) {
          callbacksRef.current.onError?.("当前设备不支持定位");
          return;
        }

        const geoOptions = { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 };

        navigator.geolocation.getCurrentPosition(
          (pos) => broadcastPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }, true),
          handleGeoError,
          geoOptions,
        );

        watchIdRef.current = navigator.geolocation.watchPosition(
          handleGeoSuccess,
          handleGeoError,
          geoOptions,
        );

        heartbeatRef.current = setInterval(() => {
          if (latestCoordsRef.current) {
            broadcastPosition(latestCoordsRef.current, true);
          }
        }, LIVE_LOCATION_HEARTBEAT_MS);
      }
    });

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      watchStartedRef.current = false;
      latestCoordsRef.current = null;
      lastBroadcastRef.current = null;
      lastBroadcastAtRef.current = 0;
    };
  }, [broadcastPosition, conversationId, userId]);

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
          onClick={() => void handleStop("manual")}
          disabled={isStopping}
          className="ml-3 px-4 py-1.5 bg-destructive text-destructive-foreground rounded-full text-xs font-semibold hover:bg-destructive/90 transition-colors shrink-0 flex items-center gap-1.5 disabled:opacity-60"
        >
          {isStopping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <StopCircle className="h-3.5 w-3.5" />}
          {isStopping ? "结束中..." : "结束共享"}
        </button>
      </div>
    </div>
  );
}
