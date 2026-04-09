import { useState, useRef, useEffect, useMemo, useCallback } from "react";
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
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);

  // Generate stable random bar heights
  const barCount = voice ? Math.max(6, Math.min(Math.round((voice.duration || 1) * 2), 20)) : 8;
  const barHeights = useMemo(
    () => Array.from({ length: barCount }, () => 4 + Math.random() * 14),
    [barCount]
  );

  const updateProgress = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.duration && !audio.paused) {
      setProgress(audio.currentTime / audio.duration);
      rafRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (!voice) return null;

  const toggle = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(voice.url);
      audioRef.current.onended = () => {
        setPlaying(false);
        setProgress(0);
        cancelAnimationFrame(rafRef.current);
      };
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
      cancelAnimationFrame(rafRef.current);
    } else {
      audioRef.current.play();
      setPlaying(true);
      rafRef.current = requestAnimationFrame(updateProgress);
    }
  };

  const dur = Math.round(voice.duration || 0);
  const width = Math.min(80 + dur * 8, 220);
  const playedBars = Math.floor(progress * barCount);

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl text-sm select-none ${
        isMe
          ? "bg-primary text-primary-foreground rounded-br-md"
          : "bg-muted text-foreground rounded-bl-md"
      }`}
      style={{ minWidth: `${width}px` }}
    >
      {playing ? (
        <Pause className="h-4 w-4 shrink-0" />
      ) : (
        <Play className="h-4 w-4 shrink-0" />
      )}

      {/* Waveform bars with progress */}
      <div className="flex items-center gap-[2px] flex-1 h-5">
        {barHeights.map((h, i) => {
          const isPast = i < playedBars;
          const barColor = isMe
            ? isPast
              ? "bg-primary-foreground"
              : "bg-primary-foreground/35"
            : isPast
              ? "bg-foreground"
              : "bg-foreground/30";

          return (
            <div
              key={i}
              className={`w-[3px] rounded-full transition-all duration-150 ${barColor} ${
                playing && i >= playedBars && i < playedBars + 2
                  ? "animate-pulse"
                  : ""
              }`}
              style={{
                height: `${h}px`,
                transform: playing && i === playedBars ? "scaleY(1.2)" : "scaleY(1)",
                transition: "transform 0.15s, background-color 0.15s",
              }}
            />
          );
        })}
      </div>

      {/* Duration / elapsed */}
      <span className="text-xs opacity-70 tabular-nums min-w-[2ch] text-right">
        {playing ? `${Math.floor(progress * dur)}″` : `${dur}″`}
      </span>
    </button>
  );
}
