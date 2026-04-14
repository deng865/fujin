import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostCreditBadgeProps {
  avgRating: number;
  totalReviews: number;
  topTag: string | null;
  isMobile?: boolean;
  className?: string;
}

const mobileDefaultTag = "准时";
const fixedDefaultTag = "好评如潮";

export default function PostCreditBadge({
  avgRating, totalReviews, topTag, isMobile, className,
}: PostCreditBadgeProps) {
  if (totalReviews === 0) return null;

  const displayTag = topTag || (isMobile ? mobileDefaultTag : fixedDefaultTag);

  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />
      <span className="text-xs font-semibold text-foreground">{avgRating}</span>
      <span className="text-[10px] text-muted-foreground">({totalReviews})</span>
      {displayTag && (
        <span className={cn(
          "px-1.5 py-0.5 rounded text-[10px] font-medium",
          isMobile
            ? "bg-blue-500/10 text-blue-600"
            : "bg-amber-500/10 text-amber-700"
        )}>
          {displayTag}
        </span>
      )}
    </div>
  );
}
