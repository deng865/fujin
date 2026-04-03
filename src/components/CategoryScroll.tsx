import { useState, useEffect } from "react";
import {
  Home, Briefcase, Car, UtensilsCrossed, GraduationCap, Plane, UserCheck, Scale,
  MapPin, Wrench, ShoppingBag, Heart, Music, Camera, Star, Coffee, Scissors,
  MoreHorizontal, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home, Briefcase, Car, UtensilsCrossed, GraduationCap, Plane, UserCheck, Scale,
  MapPin, Wrench, ShoppingBag, Heart, Music, Camera, Star, Coffee, Scissors,
};

// Fallback hardcoded categories
const fallbackCategories = [
  { name: "housing", label: "房产", icon: "Home" },
  { name: "jobs", label: "找工", icon: "Briefcase" },
  { name: "auto", label: "汽车", icon: "Car" },
  { name: "food", label: "美食", icon: "UtensilsCrossed" },
  { name: "education", label: "教育", icon: "GraduationCap" },
  { name: "travel", label: "旅游", icon: "Plane" },
  { name: "driver", label: "司机", icon: "UserCheck" },
  { name: "legal", label: "律师", icon: "Scale" },
];

const MAX_VISIBLE = 7;

interface CategoryScrollProps {
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

export default function CategoryScroll({ selectedCategory, onSelectCategory }: CategoryScrollProps) {
  const [categories, setCategories] = useState(fallbackCategories);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("categories")
        .select("name, label, icon")
        .eq("is_visible", true)
        .order("sort_order", { ascending: true });
      if (data && data.length > 0) {
        setCategories(data);
      }
    };
    load();
  }, []);

  const visibleCategories = showAll ? categories : categories.slice(0, MAX_VISIBLE);
  const hasMore = categories.length > MAX_VISIBLE;

  return (
    <div className="absolute top-[72px] left-0 right-0 z-10 pointer-events-none">
      <div className="pointer-events-auto px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {/* All button */}
        <button
          onClick={() => onSelectCategory(null)}
          className={cn(
            "shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 shadow-md border border-border/20",
            !selectedCategory
              ? "bg-primary text-primary-foreground shadow-lg"
              : "bg-background/80 backdrop-blur-xl text-foreground hover:bg-accent"
          )}
        >
          全部
        </button>

        {/* Category buttons */}
        {visibleCategories.map((cat) => {
          const Icon = iconMap[cat.icon] || MapPin;
          const isActive = selectedCategory === cat.name;
          return (
            <button
              key={cat.name}
              onClick={() => onSelectCategory(isActive ? null : cat.name)}
              className={cn(
                "shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 shadow-md border border-border/20",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-background/80 backdrop-blur-xl text-foreground hover:bg-accent"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat.label}
            </button>
          );
        })}

        {/* More / Collapse button */}
        {hasMore && (
          <button
            onClick={() => setShowAll(!showAll)}
            className={cn(
              "shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 shadow-md border border-border/20",
              "bg-background/80 backdrop-blur-xl text-foreground hover:bg-accent"
            )}
          >
            {showAll ? (
              <>
                <X className="h-3.5 w-3.5" />
                收起
              </>
            ) : (
              <>
                <MoreHorizontal className="h-3.5 w-3.5" />
                更多
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
