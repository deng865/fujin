import { MapPin } from "lucide-react";
import { useState } from "react";
import InAppNavMap from "./InAppNavMap";

interface LocationData {
  type: "location";
  lat: number;
  lng: number;
  address?: string;
}

interface LocationMessageProps {
  content: string;
  isMe: boolean;
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

export default function LocationMessage({ content, isMe }: LocationMessageProps) {
  const [showNavMap, setShowNavMap] = useState(false);
  const loc = parseLocationMessage(content);
  if (!loc) return null;

  const mapPreviewUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+ef4444(${loc.lng},${loc.lat})/${loc.lng},${loc.lat},14,0/280x160@2x?access_token=${import.meta.env.VITE_MAPBOX_TOKEN || ""}`;

  return (
    <>
      <div
        className={`rounded-2xl overflow-hidden cursor-pointer ${
          isMe ? "rounded-br-md" : "rounded-bl-md"
        }`}
        onClick={() => setShowNavMap(true)}
      >
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
        </div>
        <div className={`px-3 py-2 flex items-center gap-1.5 text-xs ${
          isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        }`}>
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{loc.address || "共享位置"}</span>
        </div>
      </div>

      {showNavMap && (
        <InAppNavMap
          lat={loc.lat}
          lng={loc.lng}
          address={loc.address}
          onClose={() => setShowNavMap(false)}
        />
      )}
    </>
  );
}
