import { useState, useEffect } from "react";
import { Loader2, ImageIcon } from "lucide-react";
import { api } from "@/lib/api";

interface ProxiedImageProps {
  src: string;
  className?: string;
  alt?: string;
}

export function ProxiedImage({ src, className = "", alt = "Anexo" }: ProxiedImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/uploads/media-proxy", {
        params: { url: src },
        responseType: "blob",
      })
      .then((res) => {
        if (cancelled) return;
        const url = URL.createObjectURL(res.data);
        setBlobUrl(url);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-lg h-32 ${className}`}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className={`flex items-center gap-2 text-muted-foreground ${className}`}>
        <ImageIcon className="w-4 h-4" />
        <span className="text-xs">Erro ao carregar imagem</span>
      </div>
    );
  }

  return (
    <img
      src={blobUrl}
      alt={alt}
      className={`rounded-lg max-h-48 object-contain cursor-pointer ${className}`}
      onClick={() => window.open(blobUrl, "_blank")}
    />
  );
}
