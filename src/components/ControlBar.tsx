import { useState, useRef, useEffect } from "react";
import { Search, Plus, Home, Briefcase, Car, UtensilsCrossed, GraduationCap, Plane, UserCheck, Scale, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

const categories = [
  { id: "housing", label: "房产", icon: Home, color: "bg-blue-500" },
  { id: "jobs", label: "找工", icon: Briefcase, color: "bg-emerald-500" },
  { id: "auto", label: "汽车", icon: Car, color: "bg-orange-500" },
  { id: "food", label: "美食", icon: UtensilsCrossed, color: "bg-red-500" },
  { id: "education", label: "教育", icon: GraduationCap, color: "bg-purple-500" },
  { id: "travel", label: "旅游", icon: Plane, color: "bg-cyan-500" },
  { id: "driver", label: "司机", icon: UserCheck, color: "bg-yellow-500" },
  { id: "legal", label: "律师", icon: Scale, color: "bg-indigo-500" },
];

interface ControlBarProps {
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  searchRadius: number;
  onSearchRadiusChange: (radius: number) => void;
  onPlaceSelect: (location: { lat: number; lng: number; name: string }) => void;
  onPostClick: () => void;
}

export default function ControlBar({
  selectedCategory,
  onSelectCategory,
  searchRadius,
  onSearchRadiusChange,
  onPlaceSelect,
  onPostClick,
}: ControlBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [showCategories, setShowCategories] = useState(false);

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

  const activeCat = categories.find((c) => c.id === selectedCategory);

  return (
    <div className="absolute top-4 left-4 right-4 z-10 flex items-start gap-2 pointer-events-none">
      {/* Main control panel */}
      <div className="pointer-events-auto bg-background/85 backdrop-blur-2xl rounded-2xl shadow-xl border border-border/40 overflow-hidden max-w-2xl w-full">
        {/* Top row: search + distance + post */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="搜索城市..."
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground min-w-0"
          />
          <div className="h-5 w-px bg-border/60 shrink-0" />
          {/* Distance */}
          <div className="flex items-center gap-2 shrink-0 w-32 sm:w-40">
            <Slider
              value={[searchRadius]}
              onValueChange={([v]) => onSearchRadiusChange(v)}
              min={1}
              max={100}
              step={1}
              className="w-full"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap font-medium w-10 text-right">{searchRadius}km</span>
          </div>
          <div className="h-5 w-px bg-border/60 shrink-0" />
          <button
            onClick={onPostClick}
            className="shrink-0 bg-primary text-primary-foreground rounded-xl px-3 py-1.5 text-xs font-semibold hover:opacity-90 transition-all active:scale-95 flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">发布</span>
          </button>
        </div>

        {/* Category row */}
        <div className="border-t border-border/30 px-2 py-1.5 flex items-center gap-1 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => onSelectCategory(null)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95",
              !selectedCategory
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            )}
          >
            全部
          </button>
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(isActive ? null : cat.id)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
