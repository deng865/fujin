import { MapPin, ExternalLink, X } from "lucide-react";
import { openMapNavigation } from "@/lib/mapNavigation";
import { useState } from "react";
import AvatarMarker from "../AvatarMarker";

interface LocationData {
  type: "location";
  lat: number;
  lng: number;
  address?: string;
  senderName?: string;
}

interface LocationMessageProps {
  content: string;
  isMe: boolean;
  senderName?: string;
  senderAvatarUrl?: string | null;
}

export function parseLocationMessage(content: string): LocationData | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.type === "location" && typeof parsed.lat === "number" && typeof parsed.lng === "number") {
      return parsed as LocationData;
    }
  } catch {
    // not a location message
  }
  return null;
}

export default function LocationMessage({ content, isMe, senderName, senderAvatarUrl }: LocationMessageProps) {
  const [showPicker, setShowPicker] = useState(false);
  const loc = parseLocationMessage(content);
  if (!loc) return null;

  const displayName = loc.senderName || senderName || "";
  const label = displayName ? `${displayName}的位置` : (loc.address || "位置信息");

  const mapPreviewUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${loc.lng},${loc.lat},14,0/280x160@2x?access_token=${import.meta.env.VITE_MAPBOX_TOKEN || ""}`;

  const googleUrl = `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;
  const appleUrl = `https://maps.apple.com/?ll=${loc.lat},${loc.lng}&q=${loc.address ? encodeURIComponent(loc.address) : `${loc.lat},${loc.lng}`}`;

  return (
    <>
      {/* Location card — tap anywhere to open picker */}
      <div
        className={`rounded-2xl overflow-hidden cursor-pointer active:opacity-80 transition-opacity ${
          isMe ? "rounded-br-md" : "rounded-bl-md"
        }`}
        onClick={() => setShowPicker(true)}
      >
        {/* Map preview */}
        <div className="relative w-[220px] h-[120px] bg-muted">
          {import.meta.env.VITE_MAPBOX_TOKEN ? (
            <img
              src={mapPreviewUrl}
              alt="位置"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <AvatarMarker avatarUrl={senderAvatarUrl} name={displayName} size={40} />
          </div>
        </div>

        {/* Info bar */}
        <div className={`px-3 py-2 flex flex-col gap-0.5 text-xs ${
          isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        }`}>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate font-medium">{label}</span>
          </div>
          {displayName && loc.address && (
            <span className="truncate opacity-70 pl-5">{loc.address}</span>
          )}
        </div>
      </div>

      {/* Full-screen modal picker */}
      {showPicker && (
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40 animate-in fade-in duration-200"
          onClick={() => setShowPicker(false)}
        >
          <div
            className="w-full max-w-sm mb-safe bg-background rounded-t-2xl shadow-xl animate-in slide-in-from-bottom duration-300 pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Title */}
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-sm font-semibold text-foreground">选择地图应用</span>
              <button
                onClick={() => setShowPicker(false)}
                className="p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Options */}
            <div className="px-4 flex flex-col gap-2">
              <a
                href={googleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                onClick={() => setShowPicker(false)}
              >
                <span className="text-2xl">🗺️</span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">Google 地图</span>
                  <span className="text-xs text-muted-foreground">在浏览器中打开</span>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground ml-auto" />
              </a>

              <a
                href={appleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                onClick={() => setShowPicker(false)}
              >
                <span className="text-2xl">🍎</span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">Apple 地图</span>
                  <span className="text-xs text-muted-foreground">在浏览器中打开</span>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground ml-auto" />
              </a>
            </div>

            {/* Cancel */}
            <div className="px-4 mt-3">
              <button
                onClick={() => setShowPicker(false)}
                className="w-full py-3 rounded-xl bg-muted text-sm font-medium text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
