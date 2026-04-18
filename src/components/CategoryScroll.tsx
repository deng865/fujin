import { useState, useEffect } from "react";
import {
  Home, Briefcase, Car, UtensilsCrossed, GraduationCap, Plane, UserCheck, Scale,
  MapPin, Wrench, ShoppingBag, Heart, Music, Camera, Star, Coffee, Scissors,
  Stethoscope, Building, Dumbbell, Baby, Dog, Laptop, Paintbrush, Hammer,
  BookOpen, Headphones, Truck, Wallet, Globe, Flower2, Sparkles, Pizza,
  MoreHorizontal, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home, Briefcase, Car, UtensilsCrossed, GraduationCap, Plane, UserCheck, Scale,
  MapPin, Wrench, ShoppingBag, Heart, Music, Camera, Star, Coffee, Scissors,
  Stethoscope, Building, Dumbbell, Baby, Dog, Laptop, Paintbrush, Hammer,
  BookOpen, Headphones, Truck, Wallet, Globe, Flower2, Sparkles, Pizza,
};

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
  const [categories, setCategories] = useState<typeof fallbackCategories>([]);
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
      } else {
        setCategories(fallbackCategories);
      }
    };
    load();
  }, []);

  const visibleCategories = categories.slice(0, MAX_VISIBLE);
  const hasMore = categories.length > MAX_VISIBLE;

  const handleSelect = (name: string | null) => {
    onSelectCategory(name);
    setShowAll(false);
  };

  const pillClass = (isActive: boolean) =>
    cn(
      "shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 shadow-md border border-border/20",
      isActive
        ? "bg-primary text-primary-foreground shadow-lg"
        : "bg-background/80 backdrop-blur-xl text-foreground hover:bg-accent"
    );

  return (
    <>
      {/* Horizontal scroll bar */}
      <div
        className="absolute left-0 right-0 z-10 pointer-events-none"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 72px)" }}
      >
        <div className="pointer-events-auto px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <button onClick={() => handleSelect(null)} className={pillClass(!selectedCategory)}>
            全部
          </button>

          {visibleCategories.map((cat) => {
            const Icon = iconMap[cat.icon] || MapPin;
            return (
              <button
                key={cat.name}
                onClick={() => handleSelect(selectedCategory === cat.name ? null : cat.name)}
                className={pillClass(selectedCategory === cat.name)}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            );
          })}

          {hasMore && (
            <button
              onClick={() => setShowAll(true)}
              className={cn(pillClass(false), "gap-1")}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
              更多
            </button>
          )}
        </div>
      </div>

      {/* Full-screen category panel (Google Maps style) */}
      {showAll && (
        <div className="fixed inset-0 z-[1000] flex flex-col bg-background/95 backdrop-blur-md animate-in slide-in-from-bottom duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
            <h2 className="text-base font-bold text-foreground">选择分类</h2>
            <button
              onClick={() => setShowAll(false)}
              className="p-2 rounded-full hover:bg-accent active:scale-95 transition-all"
            >
              <X className="h-5 w-5 text-foreground" />
            </button>
          </div>

          {/* Category list */}
          <div className="flex-1 overflow-y-auto pb-32">
            {/* "All" option */}
            <button
              onClick={() => handleSelect(null)}
              className={cn(
                "w-full flex items-center gap-4 px-5 py-4 border-b border-border/10 active:bg-accent/50 transition-colors",
                !selectedCategory && "bg-primary/5"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                !selectedCategory ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                <MapPin className="h-5 w-5" />
              </div>
              <span className={cn("text-sm font-medium", !selectedCategory && "text-primary")}>
                全部分类
              </span>
              {!selectedCategory && (
                <span className="ml-auto text-xs text-primary font-semibold">✓</span>
              )}
            </button>

            {categories.map((cat) => {
              const Icon = iconMap[cat.icon] || MapPin;
              const isActive = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => handleSelect(isActive ? null : cat.name)}
                  className={cn(
                    "w-full flex items-center gap-4 px-5 py-4 border-b border-border/10 active:bg-accent/50 transition-colors",
                    isActive && "bg-primary/5"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                    isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={cn("text-sm font-medium", isActive && "text-primary")}>
                    {cat.label}
                  </span>
                  {isActive && (
                    <span className="ml-auto text-xs text-primary font-semibold">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
