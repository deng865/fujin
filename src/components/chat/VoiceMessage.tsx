import { useState, useRef } from "react";
import { Play, Pause } from "lucide-react";

export interface VoiceData {
  type: "voice";
  url: string;
  duration: number; // seconds
}

export function parseVoiceMessage(content: string): VoiceData | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.type === "voice" && parsed.url) {
      return parsed as VoiceData;
    }
  } catch {}
  return null;
}

interface VoiceMessageProps {
  content: string;
  isMe: boolean;
}

export default function VoiceMessage({ content, isMe }: VoiceMessageProps) {
  const voice = parseVoiceMessage(content);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!voice) return null;

  const toggle = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(voice.url);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const dur = Math.round(voice.duration || 0);
  const width = Math.min(60 + dur * 8, 200);

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-sm ${
        isMe
          ? "bg-primary text-primary-foreground rounded-br-md"
          : "bg-muted text-foreground rounded-bl-md"
      }`}
      style={{ minWidth: `${width}px` }}
    >
      {playing ? <Pause className="h-4 w-4 shrink-0" /> : <Play className="h-4 w-4 shrink-0" />}
      <div className="flex items-center gap-0.5 flex-1">
        {Array.from({ length: Math.max(3, Math.min(dur, 12)) }).map((_, i) => (
          <div
            key={i}
            className={`w-0.5 rounded-full ${isMe ? "bg-primary-foreground/60" : "bg-foreground/40"}`}
            style={{ height: `${8 + Math.random() * 10}px` }}
          />
        ))}
      </div>
      <span className="text-xs opacity-70">{dur}″</span>
    </button>
  );
}
