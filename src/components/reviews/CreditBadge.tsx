import { Star, Shield, ShieldCheck, ShieldAlert, UserCircle } from "lucide-react";

interface Props {
  averageRating: number | null;
  totalRatings?: number | null;
  size?: "sm" | "md";
  showLabel?: boolean;
}

interface CreditTier {
  label: string;
  colorClass: string;
  bgClass: string;
  icon: typeof Star;
}

function getCreditTier(rating: number | null, count: number | null): CreditTier {
  const total = count ?? 0;
  const avg = rating ?? 0;

  if (total < 3) {
    return { label: "新用户", colorClass: "text-muted-foreground", bgClass: "bg-muted", icon: UserCircle };
  }
  if (avg >= 4.5 && total >= 10) {
    return { label: "金牌信用", colorClass: "text-amber-500", bgClass: "bg-amber-500/10", icon: ShieldCheck };
  }
  if (avg >= 4.0) {
    return { label: "优质用户", colorClass: "text-emerald-500", bgClass: "bg-emerald-500/10", icon: Shield };
  }
  if (avg >= 3.0) {
    return { label: "普通用户", colorClass: "text-blue-500", bgClass: "bg-blue-500/10", icon: Shield };
  }
  return { label: "低信用", colorClass: "text-destructive", bgClass: "bg-destructive/10", icon: ShieldAlert };
}

export { getCreditTier };

export default function CreditBadge({ averageRating, totalRatings, size = "sm", showLabel = true }: Props) {
  const total = totalRatings ?? 0;
  const tier = getCreditTier(averageRating, total);
  const TierIcon = tier.icon;

  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  // Always show badge (even for new users)
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${textSize} font-medium ${tier.colorClass} ${tier.bgClass} px-1.5 py-0.5 rounded-full`}
      title={`${tier.label}${averageRating ? ` · ${averageRating.toFixed(1)}分` : ""}`}
    >
      <TierIcon className={`${iconSize}`} />
      {showLabel && <span>{tier.label}</span>}
      {averageRating && total >= 3 && (
        <>
          <Star className={`${iconSize} fill-current ml-0.5`} />
          <span>{averageRating.toFixed(1)}</span>
        </>
      )}
      {total > 0 && (
        <span className="text-muted-foreground font-normal">({total})</span>
      )}
    </span>
  );
}
