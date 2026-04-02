import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { GOOGLE_MAPS_API_KEY } from "@/lib/googleMaps";

interface SearchBarProps {
  onPlaceSelect: (location: { lat: number; lng: number; name: string }) => void;
}

export default function SearchBar({ onPlaceSelect }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!inputRef.current || !window.google?.maps?.places) return;

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
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
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-full max-w-md px-4">
      <div className="bg-background/90 backdrop-blur-xl rounded-2xl shadow-lg border border-border/50 flex items-center px-4 py-3 gap-3">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder="搜索城市 / Search city..."
          className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}
