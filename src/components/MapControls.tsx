import { Crosshair, Layers, Map as MapIcon, Satellite, Mountain, Navigation } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface MapControlsProps {
  onLocateMe: () => void;
  onMapTypeChange: (type: string) => void;
  currentMapType: string;
  onResetNorth?: () => void;
  bearing?: number;
  bottomOffset?: number;
}
const mapTypes = [
  { id: "roadmap", label: "标准", icon: MapIcon },
  { id: "satellite", label: "卫星", icon: Satellite },
  { id: "terrain", label: "地形", icon: Mountain },
];

export default function MapControls({ onLocateMe, onMapTypeChange, currentMapType, onResetNorth, bearing = 0, bottomOffset = 0 }: MapControlsProps) {
  const [showLayers, setShowLayers] = useState(false);

  return (
    <div
      className="absolute right-4 z-10 flex flex-col gap-2 items-end transition-[bottom] duration-300 ease-out"
      style={{ bottom: `calc(${72 + bottomOffset + 16}px + env(safe-area-inset-bottom))` }}
    >
      {showLayers && (
        <div className="bg-background/80 backdrop-blur-2xl rounded-2xl shadow-xl border border-border/30 p-1.5 flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {mapTypes.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => { onMapTypeChange(t.id); setShowLayers(false); }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all active:scale-95",
                  currentMapType === t.id
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-accent"
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={onResetNorth}
        className="bg-background/80 backdrop-blur-2xl rounded-2xl shadow-xl border border-border/30 p-3 hover:bg-accent transition-all active:scale-95"
      >
        <Navigation
          className="h-5 w-5 text-foreground transition-transform duration-300"
          style={{ transform: `rotate(${-bearing}deg)` }}
        />
      </button>

      <button
        onClick={() => setShowLayers(!showLayers)}
        className="bg-background/80 backdrop-blur-2xl rounded-2xl shadow-xl border border-border/30 p-3 hover:bg-accent transition-all active:scale-95"
      >
        <Layers className="h-5 w-5 text-foreground" />
      </button>

      <button
        onClick={onLocateMe}
        className="bg-background/80 backdrop-blur-2xl rounded-2xl shadow-xl border border-border/30 p-3 hover:bg-accent transition-all active:scale-95"
      >
        <Crosshair className="h-5 w-5 text-foreground" />
      </button>
    </div>
  );
}
