import { useState } from "react";
import { Star, Send } from "lucide-react";

export interface TripRatingData {
  type: "trip_rating";
  from: string;
  to: string;
  price?: string;
  rating: number;
  comment?: string;
  ratedUserId: string;
}

export function parseTripRatingMessage(content: string): TripRatingData | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.type === "trip_rating") return parsed as TripRatingData;
  } catch {}
  return null;
}

interface TripRatingProps {
  content: string;
  isMe: boolean;
  currentUserId?: string;
}

export default function TripRatingDisplay({ content, isMe, currentUserId }: TripRatingProps) {
  const data = parseTripRatingMessage(content);
  if (!data) return null;

  // Only show rating details to the person who sent it, not the rated party
  const isRatedParty = currentUserId === data.ratedUserId;
  if (isRatedParty) {
    return (
      <div className={`rounded-2xl overflow-hidden w-[240px] ${isMe ? "rounded-br-md" : "rounded-bl-md"}`}>
        <div className={`px-3 py-2.5 ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <Star className="h-3.5 w-3.5" />
            对方已完成评价
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl overflow-hidden w-[240px] ${isMe ? "rounded-br-md" : "rounded-bl-md"}`}>
      <div className={`px-3 py-2.5 ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
        <div className="flex items-center gap-1.5 text-xs font-medium mb-1.5">
          <Star className="h-3.5 w-3.5" />
          行程评价
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            </div>
            <span className="break-words">{data.from}</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
            </div>
            <span className="break-words">{data.to}</span>
          </div>
        </div>
        <div className={`mt-2 pt-2 border-t ${isMe ? "border-primary-foreground/20" : "border-border/50"}`}>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`h-4 w-4 ${s <= data.rating ? "fill-yellow-400 text-yellow-400" : isMe ? "text-primary-foreground/30" : "text-muted-foreground/30"}`}
              />
            ))}
            <span className="text-xs ml-1 font-medium">{data.rating}分</span>
          </div>
          {data.comment && (
            <p className="text-xs mt-1 opacity-80">{data.comment}</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface TripRatingInputProps {
  onSubmit: (rating: number, comment: string) => void;
}

export function TripRatingInput({ onSubmit }: TripRatingInputProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => setRating(s)}
            onMouseEnter={() => setHoverRating(s)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={`h-5 w-5 transition-colors ${
                s <= (hoverRating || rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground/40"
              }`}
            />
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="评价一下（选填）"
          className="flex-1 min-w-0 rounded-md px-2 py-1 text-xs bg-background text-foreground outline-none"
          maxLength={100}
        />
        <button
          onClick={() => {
            if (rating > 0) onSubmit(rating, comment.trim());
          }}
          disabled={rating === 0}
          className="p-1 rounded-md bg-primary-foreground/20 hover:bg-primary-foreground/30 disabled:opacity-50 transition-colors shrink-0"
        >
          <Send className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
