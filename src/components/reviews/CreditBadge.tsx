import { Star } from "lucide-react";

interface Props {
  averageRating: number | null;
  totalRatings?: number | null;
  size?: "sm" | "md";
}

export default function CreditBadge({ averageRating, totalRatings, size = "sm" }: Props) {
  if (!averageRating || !totalRatings) return null;

  const isLowCredit = averageRating < 3.0;
  const starSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${textSize} font-medium ${
        isLowCredit ? "text-destructive" : "text-yellow-500"
      }`}
      title={isLowCredit ? "低信用用户" : `评分 ${averageRating}`}
    >
      <Star className={`${starSize} fill-current`} />
      {averageRating.toFixed(1)}
      {totalRatings > 0 && (
        <span className="text-muted-foreground font-normal">({totalRatings})</span>
      )}
    </span>
  );
}
