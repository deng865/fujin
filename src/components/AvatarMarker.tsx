import { User } from "lucide-react";

interface AvatarMarkerProps {
  avatarUrl?: string | null;
  name?: string;
  size?: number;
  borderColor?: string;
}

export default function AvatarMarker({
  avatarUrl,
  name,
  size = 36,
  borderColor = "hsl(var(--primary))",
}: AvatarMarkerProps) {
  const innerSize = size - 4;

  return (
    <div
      className="rounded-full shadow-lg flex items-center justify-center"
      style={{
        width: size,
        height: size,
        border: `2.5px solid ${borderColor}`,
        backgroundColor: "hsl(var(--background))",
      }}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name || ""}
          className="rounded-full object-cover"
          style={{ width: innerSize, height: innerSize }}
        />
      ) : (
        <div
          className="rounded-full bg-primary/20 flex items-center justify-center"
          style={{ width: innerSize, height: innerSize }}
        >
          {name ? (
            <span className="text-primary font-bold" style={{ fontSize: innerSize * 0.45 }}>
              {name.charAt(0).toUpperCase()}
            </span>
          ) : (
            <User className="text-primary" style={{ width: innerSize * 0.55, height: innerSize * 0.55 }} />
          )}
        </div>
      )}
    </div>
  );
}
