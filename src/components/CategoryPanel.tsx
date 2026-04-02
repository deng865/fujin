import { useState } from "react";
import { Home, Briefcase, Car, UtensilsCrossed, GraduationCap, Plane, UserCheck, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const categories = [
  { id: "housing", label: "房产", labelEn: "Housing", icon: Home },
  { id: "jobs", label: "找工", labelEn: "Jobs", icon: Briefcase },
  { id: "auto", label: "汽车", labelEn: "Auto", icon: Car },
  { id: "food", label: "美食", labelEn: "Food", icon: UtensilsCrossed },
  { id: "education", label: "教育", labelEn: "Edu", icon: GraduationCap },
  { id: "travel", label: "旅游", labelEn: "Travel", icon: Plane },
  { id: "driver", label: "司机", labelEn: "Driver", icon: UserCheck },
];

interface CategoryPanelProps {
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
  searchRadius: number;
  onSearchRadiusChange: (radius: number) => void;
}

export default function CategoryPanel({
  selectedCategory,
  onSelectCategory,
  searchRadius,
  onSearchRadiusChange,
}: CategoryPanelProps) {
  const [showRadius, setShowRadius] = useState(false);

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
      {/* Category grid */}
      <div className="bg-background/90 backdrop-blur-xl rounded-2xl shadow-lg border border-border/50 p-2 flex flex-col gap-1">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(isActive ? null : cat.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Radius control */}
      <button
        onClick={() => setShowRadius(!showRadius)}
        className="bg-background/90 backdrop-blur-xl rounded-2xl shadow-lg border border-border/50 p-3 flex items-center justify-center hover:bg-accent transition-all"
      >
        <SlidersHorizontal className="h-4 w-4 text-foreground" />
      </button>

      {showRadius && (
        <div className="bg-background/90 backdrop-blur-xl rounded-2xl shadow-lg border border-border/50 p-3 w-48">
          <p className="text-xs text-muted-foreground mb-2">搜索范围 / Radius: {searchRadius}km</p>
          <input
            type="range"
            min={1}
            max={100}
            value={searchRadius}
            onChange={(e) => onSearchRadiusChange(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
      )}
    </div>
  );
}
