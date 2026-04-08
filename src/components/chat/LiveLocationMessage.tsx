import { Radio, MapPin } from "lucide-react";

interface LiveLocationData {
  type: "live_location";
  lat: number;
  lng: number;
  address?: string;
  durationMinutes: number;
  sharedBy: string;
}

interface LiveLocationMessageProps {
  content: string;
  isMe: boolean;
  onOpen: () => void;
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

export default function LiveLocationMessage({ content, isMe, onOpen }: LiveLocationMessageProps) {
  const data = parseLiveLocationMessage(content);
  if (!data) return null;

  const mapPreviewUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+22c55e(${data.lng},${data.lat})/${data.lng},${data.lat},14,0/280x160@2x?access_token=${import.meta.env.VITE_MAPBOX_TOKEN || ""}`;

  const durationLabel =
    data.durationMinutes >= 60
      ? `${Math.floor(data.durationMinutes / 60)}小时`
      : `${data.durationMinutes}分钟`;

  return (
    <div
      className={`rounded-2xl overflow-hidden cursor-pointer ${isMe ? "rounded-br-md" : "rounded-bl-md"}`}
      onClick={onOpen}
    >
      <div className="relative w-[220px] h-[120px] bg-muted">
        {import.meta.env.VITE_MAPBOX_TOKEN ? (
          <img
            src={mapPreviewUrl}
            alt="实时位置"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <MapPin className="h-8 w-8 text-green-500" />
          </div>
        )}
        {/* Overlay badge */}
        <div className="absolute top-2 left-2 bg-green-500/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
          <Radio className="h-3 w-3 animate-pulse" />
          实时共享 · {durationLabel}
        </div>
      </div>
      <div className={`px-3 py-2 flex items-center gap-1.5 text-xs ${isMe ? "bg-green-600 text-white" : "bg-green-500/10 text-green-700 dark:text-green-400"}`}>
        <Radio className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">实时位置共享 · 点击查看</span>
      </div>
    </div>
  );
}
