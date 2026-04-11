import { MapPin } from "lucide-react";
import { useMapChoice } from "@/components/MapChoiceSheet";
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
  const { openMapChoice, MapChoice } = useMapChoice();
  const loc = parseLocationMessage(content);
  if (!loc) return null;

  const displayName = loc.senderName || senderName || "";
  const label = displayName ? `${displayName}的位置` : (loc.address || "位置信息");

  const mapPreviewUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${loc.lng},${loc.lat},14,0/280x160@2x?access_token=${import.meta.env.VITE_MAPBOX_TOKEN || ""}`;


  return (
    <>
      {/* Location card — tap anywhere to open picker */}
      <div
        className={`rounded-2xl overflow-hidden cursor-pointer active:opacity-80 transition-opacity ${
          isMe ? "rounded-br-md" : "rounded-bl-md"
        }`}
        onClick={() => openMapChoice(loc.lat, loc.lng)}
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

      {MapChoice}
    </>
  );
}
