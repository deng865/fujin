import { useState } from "react";
import { Route, Navigation, DollarSign, Check } from "lucide-react";

interface TripData {
  type: "trip";
  from: string;
  to: string;
  fromCoords?: { lat: number; lng: number };
  price?: string;
}

export function parseTripMessage(content: string): TripData | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.type === "trip" && parsed.from && parsed.to) return parsed as TripData;
  } catch {}
  return null;
}

export function parseTripAcceptMessage(content: string): { type: "trip_accept"; from: string; to: string; price?: string } | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.type === "trip_accept") return parsed;
  } catch {}
  return null;
}

interface TripMessageProps {
  content: string;
  isMe: boolean;
  onAccept?: (trip: TripData) => void;
}

export default function TripMessage({ content, isMe, onAccept }: TripMessageProps) {
  const [navTarget, setNavTarget] = useState<"from" | "to" | null>(null);

  // Handle trip_accept type
  const acceptData = parseTripAcceptMessage(content);
  if (acceptData) {
    return (
      <div className={`rounded-2xl overflow-hidden w-[240px] ${isMe ? "rounded-br-md" : "rounded-bl-md"}`}>
        <div className={`px-3 py-2.5 ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
          <div className="flex items-center gap-1.5 text-xs font-medium mb-1.5">
            <Check className="h-3.5 w-3.5" />
            已接受行程
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-start gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              </div>
              <span className="break-words">{acceptData.from}</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              </div>
              <span className="break-words">{acceptData.to}</span>
            </div>
          </div>
          {acceptData.price && (
            <div className={`flex items-center gap-1.5 text-xs mt-2 pt-2 border-t ${isMe ? "border-primary-foreground/20" : "border-border/50"}`}>
              <DollarSign className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">成交价: ${acceptData.price}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const trip = parseTripMessage(content);
  if (!trip) return null;

  const openNav = (target: "from" | "to", app: "apple" | "google") => {
    const query = target === "from" ? trip.from : trip.to;
    const coords = target === "from" ? trip.fromCoords : undefined;

    if (app === "apple") {
      if (coords) {
        window.open(`https://maps.apple.com/?daddr=${coords.lat},${coords.lng}&q=${encodeURIComponent(query)}`, "_blank");
      } else {
        window.open(`https://maps.apple.com/?daddr=${encodeURIComponent(query)}`, "_blank");
      }
    } else {
      if (coords) {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`, "_blank");
      } else {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`, "_blank");
      }
    }
    setNavTarget(null);
  };

  return (
    <div className="relative">
      <div className={`rounded-2xl overflow-hidden w-[240px] ${isMe ? "rounded-br-md" : "rounded-bl-md"}`}>
        <div className={`px-3 py-2.5 ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
          <div className="flex items-center gap-1.5 text-xs font-medium mb-2">
            <Route className="h-3.5 w-3.5" />
            行程信息
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500/30 flex items-center justify-center shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              </div>
              <span className="break-words flex-1">{trip.from}</span>
              <button
                onClick={() => setNavTarget(navTarget === "from" ? null : "from")}
                className={`p-1 rounded-md shrink-0 transition-colors ${isMe ? "hover:bg-primary-foreground/20" : "hover:bg-accent"}`}
                title="导航到出发地"
              >
                <Navigation className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/30 flex items-center justify-center shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              </div>
              <span className="break-words flex-1">{trip.to}</span>
              <button
                onClick={() => setNavTarget(navTarget === "to" ? null : "to")}
                className={`p-1 rounded-md shrink-0 transition-colors ${isMe ? "hover:bg-primary-foreground/20" : "hover:bg-accent"}`}
                title="导航到目的地"
              >
                <Navigation className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {trip.price && (
            <div className={`flex items-center gap-1.5 text-xs mt-2 pt-2 border-t ${isMe ? "border-primary-foreground/20" : "border-border/50"}`}>
              <DollarSign className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">期望价格: ${trip.price}</span>
            </div>
          )}
          {/* Accept button - only shown to the OTHER person (not the sender) */}
          {!isMe && trip.price && onAccept && (
            <button
              onClick={() => onAccept(trip)}
              className="w-full mt-2 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium bg-primary-foreground/20 hover:bg-primary-foreground/30 transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              接受报价
            </button>
          )}
          {!isMe && !trip.price && onAccept && (
            <button
              onClick={() => onAccept(trip)}
              className="w-full mt-2 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium bg-primary-foreground/20 hover:bg-primary-foreground/30 transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              接受行程
            </button>
          )}
        </div>
      </div>

      {navTarget && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setNavTarget(null)} />
          <div className={`absolute z-50 ${isMe ? "right-0" : "left-0"} mt-1 bg-background border border-border rounded-xl shadow-lg overflow-hidden min-w-[160px]`}>
            <div className="px-3 py-1.5 text-[11px] text-muted-foreground border-b border-border/50">
              {navTarget === "from" ? "导航到出发地" : "导航到目的地"}
            </div>
            <button
              onClick={() => openNav(navTarget, "apple")}
              className="w-full px-4 py-3 text-sm text-left hover:bg-accent flex items-center gap-2 transition-colors"
            >
              <Navigation className="h-4 w-4" />
              Apple Maps
            </button>
            <button
              onClick={() => openNav(navTarget, "google")}
              className="w-full px-4 py-3 text-sm text-left hover:bg-accent flex items-center gap-2 border-t border-border/50 transition-colors"
            >
              <Navigation className="h-4 w-4" />
              Google Maps
            </button>
          </div>
        </>
      )}
    </div>
  );
}
