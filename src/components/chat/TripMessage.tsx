import { useState } from "react";
import { Route, Navigation, DollarSign, Check, MessageCircle, Send, Star } from "lucide-react";
import { TripRatingInput } from "./TripRating";

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

export function parseTripCounterMessage(content: string): { type: "trip_counter"; from: string; to: string; price: string; originalPrice?: string } | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.type === "trip_counter") return parsed;
  } catch {}
  return null;
}

interface TripMessageProps {
  content: string;
  isMe: boolean;
  onAccept?: (trip: { from: string; to: string; price?: string }) => void;
  onCounter?: (trip: { from: string; to: string; originalPrice?: string }, newPrice: string) => void;
  onRate?: (trip: { from: string; to: string; price?: string }, rating: number, comment: string) => void;
  hasRated?: boolean;
}

export default function TripMessage({ content, isMe, onAccept, onCounter }: TripMessageProps) {
  const [navTarget, setNavTarget] = useState<"from" | "to" | null>(null);
  const [showCounterInput, setShowCounterInput] = useState(false);
  const [counterPrice, setCounterPrice] = useState("");

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

  // Handle trip_counter type
  const counterData = parseTripCounterMessage(content);
  if (counterData) {
    return (
      <div className={`rounded-2xl overflow-hidden w-[240px] ${isMe ? "rounded-br-md" : "rounded-bl-md"}`}>
        <div className={`px-3 py-2.5 ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
          <div className="flex items-center gap-1.5 text-xs font-medium mb-1.5">
            <MessageCircle className="h-3.5 w-3.5" />
            还价
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-start gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              </div>
              <span className="break-words">{counterData.from}</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              </div>
              <span className="break-words">{counterData.to}</span>
            </div>
          </div>
          <div className={`text-xs mt-2 pt-2 border-t ${isMe ? "border-primary-foreground/20" : "border-border/50"}`}>
            {counterData.originalPrice && (
              <div className="flex items-center gap-1.5 opacity-60 line-through mb-1">
                <DollarSign className="h-3 w-3 shrink-0" />
                <span>${counterData.originalPrice}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 font-medium">
              <DollarSign className="h-3.5 w-3.5 shrink-0" />
              <span>还价: ${counterData.price}</span>
            </div>
          </div>
          {/* Accept / Counter buttons for the other party */}
          {!isMe && onAccept && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onAccept({ from: counterData.from, to: counterData.to, price: counterData.price })}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium bg-primary-foreground/20 hover:bg-primary-foreground/30 transition-colors"
              >
                <Check className="h-3 w-3" />
                接受
              </button>
              {onCounter && (
                <button
                  onClick={() => { setShowCounterInput(true); setCounterPrice(""); }}
                  className="flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
                >
                  <MessageCircle className="h-3 w-3" />
                  还价
                </button>
              )}
            </div>
          )}
          {!isMe && showCounterInput && onCounter && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs shrink-0">$</span>
              <input
                value={counterPrice}
                onChange={(e) => setCounterPrice(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="输入价格"
                inputMode="decimal"
                autoFocus
                className="flex-1 min-w-0 rounded-md px-2 py-1 text-xs bg-background text-foreground outline-none"
              />
              <button
                onClick={() => {
                  if (counterPrice.trim()) {
                    onCounter({ from: counterData.from, to: counterData.to, originalPrice: counterData.price }, counterPrice.trim());
                    setShowCounterInput(false);
                  }
                }}
                disabled={!counterPrice.trim()}
                className="p-1 rounded-md bg-primary-foreground/20 hover:bg-primary-foreground/30 disabled:opacity-50 transition-colors shrink-0"
              >
                <Send className="h-3 w-3" />
              </button>
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
      window.open(coords
        ? `https://maps.apple.com/?daddr=${coords.lat},${coords.lng}&q=${encodeURIComponent(query)}`
        : `https://maps.apple.com/?daddr=${encodeURIComponent(query)}`, "_blank");
    } else {
      window.open(coords
        ? `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`
        : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`, "_blank");
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
          {/* Accept & Counter buttons for the other party */}
          {!isMe && onAccept && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onAccept(trip)}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium bg-primary-foreground/20 hover:bg-primary-foreground/30 transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
                {trip.price ? "接受报价" : "接受行程"}
              </button>
              {trip.price && onCounter && (
                <button
                  onClick={() => { setShowCounterInput(true); setCounterPrice(""); }}
                  className="flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  还价
                </button>
              )}
            </div>
          )}
          {!isMe && showCounterInput && onCounter && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs shrink-0">$</span>
              <input
                value={counterPrice}
                onChange={(e) => setCounterPrice(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="输入你的价格"
                inputMode="decimal"
                autoFocus
                className="flex-1 min-w-0 rounded-md px-2 py-1.5 text-xs bg-background text-foreground outline-none"
              />
              <button
                onClick={() => {
                  if (counterPrice.trim()) {
                    onCounter({ from: trip.from, to: trip.to, originalPrice: trip.price }, counterPrice.trim());
                    setShowCounterInput(false);
                  }
                }}
                disabled={!counterPrice.trim()}
                className="p-1.5 rounded-md bg-primary-foreground/20 hover:bg-primary-foreground/30 disabled:opacity-50 transition-colors shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
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
