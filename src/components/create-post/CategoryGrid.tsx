import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Home, Briefcase, Car, UtensilsCrossed, GraduationCap, Plane,
  UserCheck, Scale, MapPin, Recycle, Wrench, ShoppingBag, LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  Home, Briefcase, Car, UtensilsCrossed, GraduationCap, Plane,
  UserCheck, Scale, MapPin, Recycle, Wrench, ShoppingBag,
};

interface CategoryGridProps {
  selected: string;
  onSelect: (id: string) => void;
}

export default function CategoryGrid({ selected, onSelect }: CategoryGridProps) {
  const [categories, setCategories] = useState<{ name: string; label: string; icon: string }[]>([]);

  useEffect(() => {
    supabase
      .from("categories")
      .select("name, label, icon")
      .eq("is_visible", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data) setCategories(data);
      });
  }, []);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground">选择分类 / Category *</h2>
      <div className="grid grid-cols-4 gap-3">
        {categories.map((cat) => {
          const Icon = iconMap[cat.icon] || MapPin;
          const isActive = selected === cat.name;
          const label = cat.label.replace(/[^\u4e00-\u9fff\w\s]/g, "").trim().split(/\s+/)[0];
          return (
            <button
              key={cat.name}
              onClick={() => onSelect(cat.name)}
              className={cn(
                "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all",
                "text-xs font-medium active:scale-95",
                isActive
                  ? "bg-primary/10 border-primary text-primary shadow-sm"
                  : "border-border/50 hover:border-primary/30 hover:bg-accent/50 text-foreground"
              )}
            >
              <Icon className={cn("h-6 w-6", isActive && "text-primary")} />
              <span className="leading-tight text-center">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
