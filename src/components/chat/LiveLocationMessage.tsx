import { Radio, MapPin, Loader2, CheckCircle2 } from "lucide-react";

interface LiveLocationData {
  type: "live_location";
  lat: number;
  lng: number;
  address?: string;
  durationMinutes: number;
  sharedBy: string;
  status?: "pending" | "accepted" | "ended";
}

interface LiveLocationMessageProps {
  content: string;
  isMe: boolean;
  onOpen: () => void;
  onAccept?: (messageId: string) => void;
  messageId: string;
}

export function parseLiveLocationMessage(content: string): LiveLocationData | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.type === "live_location" && typeof parsed.lat === "number") {
      return parsed as LiveLocationData;
    }
  } catch {}
  return null;
}

export default function LiveLocationMessage({ content, isMe, onOpen, onAccept, messageId }: LiveLocationMessageProps) {
  const data = parseLiveLocationMessage(content);
  if (!data) return null;

  const status = data.status || "pending";

  const mapPreviewUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+22c55e(${data.lng},${data.lat})/${data.lng},${data.lat},14,0/280x160@2x?access_token=${import.meta.env.VITE_MAPBOX_TOKEN || ""}`;

  const durationLabel =
    data.durationMinutes >= 60
      ? `${Math.floor(data.durationMinutes / 60)}小时`
      : `${data.durationMinutes}分钟`;

  // Ended state
  if (status === "ended") {
    return (
      <div className={`rounded-2xl overflow-hidden ${isMe ? "rounded-br-md" : "rounded-bl-md"}`}>
        <div className="relative w-[220px] h-[80px] bg-muted flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6 text-muted-foreground mr-2" />
          <span className="text-sm text-muted-foreground">实时位置共享已结束</span>
        </div>
      </div>
    );
  }

  // Pending state
  if (status === "pending") {
    return (
      <div className={`rounded-2xl overflow-hidden ${isMe ? "rounded-br-md" : "rounded-bl-md"}`}>
        <div className="relative w-[220px] h-[120px] bg-muted">
          {import.meta.env.VITE_MAPBOX_TOKEN ? (
            <img src={mapPreviewUrl} alt="实时位置" className="w-full h-full object-cover opacity-60" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <MapPin className="h-8 w-8 text-green-500" />
            </div>
          )}
          <div className="absolute top-2 left-2 bg-yellow-500/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Radio className="h-3 w-3" />
            实时共享 · {durationLabel}
          </div>
        </div>
        <div className={`px-3 py-2.5 ${isMe ? "bg-green-600/80 text-white" : "bg-green-500/10 text-green-700 dark:text-green-400"}`}>
          {isMe ? (
            <div className="flex items-center gap-1.5 text-xs">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              <span>等待对方接受...</span>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onAccept?.(messageId); }}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-0.5 hover:opacity-80 transition-opacity"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              接受实时位置共享
            </button>
          )}
        </div>
      </div>
    );
  }

  // Accepted state — clickable to open map
  return (
    <div
      className={`rounded-2xl overflow-hidden cursor-pointer ${isMe ? "rounded-br-md" : "rounded-bl-md"}`}
      onClick={onOpen}
    >
      <div className="relative w-[220px] h-[120px] bg-muted">
        {import.meta.env.VITE_MAPBOX_TOKEN ? (
          <img src={mapPreviewUrl} alt="实时位置" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <MapPin className="h-8 w-8 text-green-500" />
          </div>
        )}
        <div className="absolute top-2 left-2 bg-green-500/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
          <Radio className="h-3 w-3 animate-pulse" />
          实时共享 · {durationLabel}
        </div>
      </div>
      <div className={`px-3 py-2 flex items-center gap-1.5 text-xs ${isMe ? "bg-green-600 text-white" : "bg-green-500/10 text-green-700 dark:text-green-400"}`}>
        <Radio className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">实时位置共享中 · 点击查看</span>
      </div>
    </div>
  );
}
