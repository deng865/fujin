import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [showDistance, setShowDistance] = useState(false);

  useEffect(() => {
    if (!inputRef.current || !(window as any).google?.maps?.places) return;
    const g = (window as any).google;
    autocompleteRef.current = new g.maps.places.Autocomplete(inputRef.current, {
      types: ["(cities)"],
      componentRestrictions: { country: ["us", "ca"] },
    });
    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace();
      if (place?.geometry?.location) {
        onPlaceSelect({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          name: place.name || "",
        });
      }
    });
  }, [onPlaceSelect]);

  return (
    <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none flex justify-center">
      <div className="pointer-events-auto bg-background/80 backdrop-blur-2xl rounded-2xl shadow-xl border border-border/30 flex items-center gap-2 px-4 py-2.5 max-w-lg w-full">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder="搜索地址 / 关键词..."
          className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground min-w-0"
        />
        <div className="h-5 w-px bg-border/50 shrink-0" />
        {/* Distance toggle */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowDistance(!showDistance)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-1"
          >
            {searchRadius}km
            <ChevronDown className="h-3 w-3" />
          </button>
          {showDistance && (
            <div className="absolute top-full right-0 mt-2 bg-background/90 backdrop-blur-2xl rounded-xl shadow-xl border border-border/30 p-3 w-48 animate-in fade-in slide-in-from-top-1 duration-150">
              <p className="text-xs text-muted-foreground mb-2">搜索范围</p>
              <Slider
                value={[searchRadius]}
                onValueChange={([v]) => onSearchRadiusChange(v)}
                min={1}
                max={100}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground text-center mt-1.5">{searchRadius} km</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
