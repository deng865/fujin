import { useState } from "react";
import { MapPin, Navigation, Loader2, Send, DollarSign } from "lucide-react";

interface TripSharePanelProps {
  onSend: (from: string, to: string, fromCoords?: { lat: number; lng: number }, price?: string) => void;
  sending: boolean;
}

export default function TripSharePanel({ onSend, sending }: TripSharePanelProps) {
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [price, setPrice] = useState("");
  const [locating, setLocating] = useState(false);
  const [fromCoords, setFromCoords] = useState<{ lat: number; lng: number } | undefined>();

  const handleUseCurrentLocation = async () => {
    setLocating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      );
      const { latitude, longitude } = pos.coords;
      setFromCoords({ lat: latitude, lng: longitude });
      let address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      try {
        const token = import.meta.env.VITE_MAPBOX_TOKEN;
        if (token) {
          const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${token}&language=zh`);
          const geo = await res.json();
          if (geo.features?.[0]?.place_name) address = geo.features[0].place_name;
        }
      } catch {}
      setFromText(address);
    } catch {} finally {
      setLocating(false);
    }
  };

  const canSend = fromText.trim() && toText.trim() && !sending;

  return (
    <div className="max-w-lg mx-auto px-4 pb-3 pt-2 space-y-3">
      <div className="text-xs font-medium text-muted-foreground mb-1">📍 发布行程信息</div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
            <div className="w-2 h-2 rounded-full bg-green-500" />
          </div>
          <input
            value={fromText}
            onChange={(e) => setFromText(e.target.value)}
            placeholder="出发地"
            className="flex-1 min-w-0 bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
          <button
            onClick={handleUseCurrentLocation}
            disabled={locating}
            className="p-2 rounded-lg bg-muted hover:bg-accent text-muted-foreground shrink-0"
            title="使用当前位置"
          >
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
            <div className="w-2 h-2 rounded-full bg-red-500" />
          </div>
          <input
            value={toText}
            onChange={(e) => setToText(e.target.value)}
            placeholder="目的地"
            className="flex-1 min-w-0 bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="期望价格（选填）"
            inputMode="decimal"
            className="flex-1 min-w-0 bg-muted rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
          <span className="text-xs text-muted-foreground shrink-0">USD</span>
        </div>
      </div>
      <button
        onClick={() => canSend && onSend(fromText.trim(), toText.trim(), fromCoords, price.trim() || undefined)}
        disabled={!canSend}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        发送行程
      </button>
    </div>
  );
}
