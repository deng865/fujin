import { useState } from "react";
import { ArrowUpDown, Clock, DollarSign, Star, Truck, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortMode = "distance" | "rating";
export type PriceRange = null | "$" | "$$" | "$$$";

export interface MapFilters {
  sort: SortMode;
  openNow: boolean;
  price: PriceRange;
  delivery: boolean;
  topRated: boolean;
}

interface MapFilterChipsProps {
  filters: MapFilters;
  onChange: (filters: MapFilters) => void;
}

export const defaultFilters: MapFilters = {
  sort: "distance",
  openNow: false,
  price: null,
  delivery: false,
  topRated: false,
};

export default function MapFilterChips({ filters, onChange }: MapFilterChipsProps) {
  const [showSort, setShowSort] = useState(false);
  const [showPrice, setShowPrice] = useState(false);

  const chipBase =
    "shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 shadow-sm border";

  const chipOn = "bg-primary text-primary-foreground border-primary/30 shadow-md";
  const chipOff = "bg-background/90 backdrop-blur-xl text-foreground border-border/30 hover:bg-accent";

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide px-4 py-2">
      {/* Sort */}
      <div className="relative shrink-0">
        <button
          onClick={() => { setShowSort(!showSort); setShowPrice(false); }}
          className={cn(chipBase, chipOff)}
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {filters.sort === "distance" ? "距离优先" : "评分最高"}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
        {showSort && (
          <div className="absolute top-full left-0 mt-1.5 bg-background border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 min-w-[120px]">
            <button
              onClick={() => { onChange({ ...filters, sort: "distance" }); setShowSort(false); }}
              className={cn("w-full px-4 py-2.5 text-xs text-left hover:bg-accent transition-colors", filters.sort === "distance" && "text-primary font-bold")}
            >
              距离最近
            </button>
            <button
              onClick={() => { onChange({ ...filters, sort: "rating" }); setShowSort(false); }}
              className={cn("w-full px-4 py-2.5 text-xs text-left hover:bg-accent transition-colors", filters.sort === "rating" && "text-primary font-bold")}
            >
              评分最高
            </button>
          </div>
        )}
      </div>

      {/* Open Now */}
      <button
        onClick={() => onChange({ ...filters, openNow: !filters.openNow })}
        className={cn(chipBase, filters.openNow ? chipOn : chipOff)}
      >
        <Clock className="h-3.5 w-3.5" />
        营业中
      </button>

      {/* Price */}
      <div className="relative shrink-0">
        <button
          onClick={() => { setShowPrice(!showPrice); setShowSort(false); }}
          className={cn(chipBase, filters.price ? chipOn : chipOff)}
        >
          <DollarSign className="h-3.5 w-3.5" />
          {filters.price || "价格"}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
        {showPrice && (
          <div className="absolute top-full left-0 mt-1.5 bg-background border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 min-w-[100px]">
            <button
              onClick={() => { onChange({ ...filters, price: null }); setShowPrice(false); }}
              className={cn("w-full px-4 py-2.5 text-xs text-left hover:bg-accent transition-colors", !filters.price && "text-primary font-bold")}
            >
              全部
            </button>
            {(["$", "$$", "$$$"] as PriceRange[]).map((p) => (
              <button
                key={p}
                onClick={() => { onChange({ ...filters, price: p }); setShowPrice(false); }}
                className={cn("w-full px-4 py-2.5 text-xs text-left hover:bg-accent transition-colors", filters.price === p && "text-primary font-bold")}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Delivery / Services */}
      <button
        onClick={() => onChange({ ...filters, delivery: !filters.delivery })}
        className={cn(chipBase, filters.delivery ? chipOn : chipOff)}
      >
        <Truck className="h-3.5 w-3.5" />
        送货上门
      </button>

      {/* Top Rated */}
      <button
        onClick={() => onChange({ ...filters, topRated: !filters.topRated })}
        className={cn(chipBase, filters.topRated ? chipOn : chipOff)}
      >
        <Star className="h-3.5 w-3.5" />
        好评优先
      </button>
    </div>
  );
}
