import { Play } from "lucide-react";

interface MediaMessageProps {
  content: string;
  isMe: boolean;
}

export interface MediaData {
  type: "media";
  urls: string[];
}

export function parseMediaMessage(content: string): MediaData | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.type === "media" && Array.isArray(parsed.urls)) {
      return parsed as MediaData;
    }
  } catch {}
  return null;
}

const isVideo = (url: string) => /\.(mp4|mov|webm)(\?|$)/i.test(url);

export default function MediaMessage({ content, isMe }: MediaMessageProps) {
  const media = parseMediaMessage(content);
  if (!media) return null;

  return (
    <div className={`rounded-2xl overflow-hidden ${isMe ? "rounded-br-md" : "rounded-bl-md"}`}>
      <div className={`grid gap-1 ${media.urls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
        {media.urls.map((url, i) =>
          isVideo(url) ? (
            <video
              key={i}
              src={url}
              controls
              playsInline
              preload="metadata"
              className="w-full max-w-[260px] max-h-[200px] rounded-lg object-cover bg-black"
            />
          ) : (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
              <img
                src={url}
                alt=""
                loading="lazy"
                className="w-full max-w-[260px] max-h-[200px] rounded-lg object-cover bg-muted"
              />
            </a>
          )
        )}
      </div>
    </div>
  );
}
