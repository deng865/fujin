import { useState, useRef, useCallback, useEffect } from "react";
import { Search, ChevronDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { MAPBOX_TOKEN } from "@/lib/mapbox";

interface ControlBarProps {
  searchRadius: number;
  onSearchRadiusChange: (radius: number) => void;
  onPlaceSelect: (location: { lat: number; lng: number; name: string }) => void;
}

export default function ControlBar({
  searchRadius,
  onSearchRadiusChange,
  onPlaceSelect,
}: ControlBarProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDistance, setShowDistance] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const distanceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDistance) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (distanceRef.current && !distanceRef.current.contains(e.target as Node)) {
        setShowDistance(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [showDistance]);

  const fetchSuggestions = useCallback(async (text: string) => {
    if (text.length < 3) { setSuggestions([]); return; }
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${MAPBOX_TOKEN}&types=place&country=us,ca&limit=5`
      );
      const data = await res.json();
      setSuggestions(data.features || []);
      setShowSuggestions(true);
    } catch { setSuggestions([]); }
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 500);
  };

  const handleSelect = (feature: any) => {
    const [lng, lat] = feature.center;
    setQuery(feature.place_name);
    setSuggestions([]);
    setShowSuggestions(false);
    onPlaceSelect({ lat, lng, name: feature.place_name });
  };

  return (
    <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none flex justify-center">
      <div className="pointer-events-auto bg-background/80 backdrop-blur-2xl rounded-2xl shadow-xl border border-border/30 max-w-lg w-full">
        <div className="flex items-center gap-2 px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="搜索城市 / Search city..."
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground min-w-0"
          />
          <div className="h-5 w-px bg-border/50 shrink-0" />
          <div className="relative shrink-0" ref={distanceRef}>
            <button
              onClick={() => setShowDistance(!showDistance)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-1"
            >
              {searchRadius}mi
              <ChevronDown className="h-3 w-3" />
            </button>
            {showDistance && (
              <div className="absolute top-full right-0 mt-2 bg-background/90 backdrop-blur-2xl rounded-xl shadow-xl border border-border/30 p-3 w-48 animate-in fade-in slide-in-from-top-1 duration-150">
                <p className="text-xs text-muted-foreground mb-2">搜索范围</p>
                <Slider
                  value={[searchRadius]}
                  onValueChange={([v]) => onSearchRadiusChange(v)}
                  onValueCommit={() => setShowDistance(false)}
                  min={1}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground text-center mt-1.5">{searchRadius} mi</p>
              </div>
            )}
          </div>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="border-t border-border/30 max-h-48 overflow-y-auto">
            {suggestions.map((f) => (
              <button
                key={f.id}
                onClick={() => handleSelect(f)}
                className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
              >
                {f.place_name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
