import { useState, useRef, useCallback } from "react";
import { Search } from "lucide-react";
import { MAPBOX_TOKEN } from "@/lib/mapbox";

interface SearchBarProps {
  onPlaceSelect: (location: { lat: number; lng: number; name: string }) => void;
}

export default function SearchBar({ onPlaceSelect }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchSuggestions = useCallback(async (text: string) => {
    if (text.length < 2) { setSuggestions([]); return; }
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
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSelect = (feature: any) => {
    const [lng, lat] = feature.center;
    setQuery(feature.place_name);
    setSuggestions([]);
    setShowSuggestions(false);
    onPlaceSelect({ lat, lng, name: feature.place_name });
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-md px-4 sm:px-0">
      <div className="bg-background/90 backdrop-blur-xl rounded-2xl shadow-lg border border-border/50">
        <div className="flex items-center px-4 py-3 gap-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="搜索城市 / Search city..."
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
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
