import { Home, Briefcase, Car, UtensilsCrossed, GraduationCap, Plane, UserCheck, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface CategoryScrollProps {
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

export default function CategoryScroll({ selectedCategory, onSelectCategory }: CategoryScrollProps) {
  return (
    <div className="absolute top-[72px] left-0 right-0 z-10 pointer-events-none">
      <div className="pointer-events-auto px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-hide">
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
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(isActive ? null : cat.id)}
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
      </div>
    </div>
  );
}
