import { useState, useRef, useEffect } from "react";
import { Play, Pause, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { api } from "@/lib/api";

interface AudioPlayerProps {
  src: string;
  className?: string;
}

export function AudioPlayer({ src, className = "" }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const listenersRef = useRef<Array<{ event: string; handler: EventListener }>>([]);

  const cleanupAudio = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      for (const { event, handler } of listenersRef.current) {
        audio.removeEventListener(event, handler);
      }
      listenersRef.current = [];
      audio.src = "";
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  const loadAndPlay = async () => {
    if (audioRef.current && blobUrlRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
      return;
    }

    cleanupAudio();
    setIsLoading(true);
    setError(false);

    try {
      // Use backend proxy to fetch media with auth
      const response = await api.get("/uploads/media-proxy", {
        params: { url: src },
        responseType: "blob",
      });

      const blob = response.data;
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      const addListener = (event: string, handler: EventListener) => {
        audio.addEventListener(event, handler);
        listenersRef.current.push({ event, handler });
      };

      addListener("loadedmetadata", () => {
        setDuration(audio.duration);
        setIsLoading(false);
      });

      addListener("timeupdate", () => {
        setCurrentTime(audio.currentTime);
      });

      addListener("ended", () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });

      addListener("error", () => {
        setError(true);
        setIsLoading(false);
        setIsPlaying(false);
      });

      audio.play();
      setIsPlaying(true);
    } catch (err) {
      console.error("Audio load error:", err);
      cleanupAudio();
      setError(true);
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const retry = () => {
    cleanupAudio();
    setError(false);
    setDuration(0);
    setCurrentTime(0);
    loadAndPlay();
  };

  const togglePlayback = () => {
    loadAndPlay();
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (error) {
    return (
      <div className={`flex items-center gap-2 text-muted-foreground ${className}`}>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={retry}
          title="Tentar novamente"
        >
          <Play className="w-4 h-4" />
        </Button>
        <span className="text-xs">Erro ao carregar áudio — clique para tentar novamente</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={togglePlayback}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </Button>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{
            width: duration ? `${(currentTime / duration) * 100}%` : "0%",
          }}
        />
      </div>
      <span className="text-xs text-muted-foreground min-w-[35px]">
        {duration ? formatTime(isPlaying ? currentTime : duration) : "0:00"}
      </span>
    </div>
  );
}
