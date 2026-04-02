import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  isFavorite: boolean;
  onClick: (e: React.MouseEvent) => void;
  size?: "sm" | "md";
  className?: string;
}

export default function FavoriteButton({ isFavorite, onClick, size = "md", className }: FavoriteButtonProps) {
  const sizeClasses = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center rounded-full transition-all duration-300 active:scale-90",
        sizeClasses,
        isFavorite
          ? "bg-destructive/10 text-destructive"
          : "bg-accent text-muted-foreground hover:text-destructive hover:bg-destructive/10",
        className
      )}
    >
      <Heart
        className={cn(
          iconSize,
          "transition-all duration-300",
          isFavorite && "fill-current scale-110"
        )}
      />
    </button>
  );
}
