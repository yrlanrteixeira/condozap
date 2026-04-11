import { useRef, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send, MessageCircle, Loader2, Lock, LockOpen, Mic, MicOff, X, Play, Pause, Paperclip, ImageIcon, Circle, CircleCheck, FileText, Download } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  useComplaintMessages,
  useSendComplaintMessage,
} from "../hooks/useComplaintChatApi";
import apiClient from "@/lib/api-client";
import type { ChatMessage } from "../hooks/useComplaintChatApi";
import { AudioPlayer } from "@/shared/components/AudioPlayer";
import { api } from "@/lib/api";
import type { ComplaintDetail, ComplaintStatusHistory } from "../types";
import { buildFeedItems } from "./chat/buildFeedItems";
import { DateSeparator } from "./chat/DateSeparator";
import { SystemEventPill } from "./chat/SystemEventPill";
import { ComplaintChatHeader } from "./chat/ComplaintChatHeader";
import type { ChatVariant, FeedItem, BubbleItem } from "./chat/types";
import { useComplaintMessagesSSE } from "../hooks/useComplaintMessagesSSE";

interface ComplaintChatProps {
  complaintId: number;
  currentUserId: string;
  variant?: ChatVariant;
  complaint?: ComplaintDetail;
  statusHistory?: ComplaintStatusHistory[];
  showInternalToggle?: boolean;
  defaultShowInternal?: boolean;
  onComplement?: (message: string) => Promise<void>;
}

const ROLE_BADGE_STYLES: Record<string, string> = {
  RESIDENT: "bg-blue-100 text-blue-700 border-blue-200",
  SYNDIC: "bg-purple-100 text-purple-700 border-purple-200",
  PROFESSIONAL_SYNDIC: "bg-purple-100 text-purple-700 border-purple-200",
  ADMIN: "bg-green-100 text-green-700 border-green-200",
  SUPER_ADMIN: "bg-green-100 text-green-700 border-green-200",
};

const ROLE_LABELS: Record<string, string> = {
  RESIDENT: "Morador",
  SYNDIC: "Síndico",
  PROFESSIONAL_SYNDIC: "Síndico",
  ADMIN: "Admin",
  SUPER_ADMIN: "Admin",
};

function RoleBadge({ role }: { role: string }) {
  const style = ROLE_BADGE_STYLES[role] ?? "bg-gray-100 text-gray-700 border-gray-200";
  const label = ROLE_LABELS[role] ?? role;
  return (
    <Badge
      variant="outline"
      className={`text-[10px] px-1.5 py-0 leading-tight ${style}`}
    >
      {label}
    </Badge>
  );
}

function isImageUrl(url: string): boolean {
  const imageExtensions = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
  const lowerUrl = url.toLowerCase();
  return imageExtensions.some((ext) => lowerUrl.includes(ext));
}

function isAudioUrl(url: string): boolean {
  const audioExtensions = [".webm", ".mp3", ".mp4", ".wav", ".ogg", ".mpeg"];
  const lowerUrl = url.toLowerCase();
  return audioExtensions.some((ext) => lowerUrl.includes(ext));
}

function ProxiedImage({ src, className }: { src: string; className?: string }) {
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
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [src]);

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
      alt="Anexo"
      className={`rounded-lg max-h-48 object-contain cursor-pointer ${className}`}
      onClick={() => window.open(blobUrl, "_blank")}
    />
  );
}

function WhatsAppStatusIndicator({ status }: { status?: string | null }) {
  if (!status) return null;

  const label = {
    SENT: "Enviada",
    DELIVERED: "Entregue",
    READ: "Entregue",
    FAILED: "Falhou",
  }[status] || status;

  return (
    <span className={`text-[10px] flex items-center gap-1 ${
      status === "FAILED" ? "text-destructive" : "text-muted-foreground"
    }`}>
      {status === "FAILED" ? (
        <X className="h-3 w-3" />
      ) : status === "SENT" ? (
        <Circle className="h-3 w-3" />
      ) : (
        <CircleCheck className="h-3 w-3" />
      )}
      {label}
    </span>
  );
}

function MessageBubble({
  message,
  isOwn,
  isFirstInCluster = true,
  isLastInCluster = true,
  variant = "admin",
}: {
  message: ChatMessage;
  isOwn: boolean;
  isFirstInCluster?: boolean;
  isLastInCluster?: boolean;
  variant?: ChatVariant;
}) {
  const timeAgo = formatDistanceToNow(new Date(message.createdAt), {
    addSuffix: true,
    locale: ptBR,
  });

  const hasImage = message.attachmentUrl && isImageUrl(message.attachmentUrl);
  const hasAudio = message.attachmentUrl && isAudioUrl(message.attachmentUrl);
  const hasUnknownAttachment = message.attachmentUrl && !hasImage && !hasAudio;

  const showHeader = isFirstInCluster;
  const showTimestamp = isLastInCluster;
  const showWhatsAppIndicator = isOwn && isLastInCluster && message.source === "WHATSAPP" && variant === "admin";

  return (
    <div className={`flex flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}>
      {showHeader && (
        <div className={`flex items-center gap-1.5 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
          <span className="text-xs font-medium text-foreground">
            {message.senderName}
          </span>
          <RoleBadge role={message.senderRole} />
          {message.isInternal && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 leading-tight bg-amber-50 text-amber-700 border-amber-200"
            >
              Interno
            </Badge>
          )}
          {message.source === "WHATSAPP" && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 leading-tight bg-emerald-50 text-emerald-700 border-emerald-200"
            >
              WhatsApp
            </Badge>
          )}
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed break-words ${
          isOwn
            ? `bg-primary text-primary-foreground${!isFirstInCluster ? " rounded-tr-sm" : ""}`
            : `bg-muted text-foreground${!isFirstInCluster ? " rounded-tl-sm" : ""}`
        }`}
      >
        {message.content !== "🎤 Mensagem de áudio" && message.content !== "📎 Anexo" && (
          <span>{message.content}</span>
        )}
        {hasImage && (
          <div className="mt-1">
            <ProxiedImage src={message.attachmentUrl!} />
          </div>
        )}
        {hasAudio && (
          <div className="mt-2">
            <AudioPlayer src={message.attachmentUrl!} className="w-full" />
          </div>
        )}
        {hasUnknownAttachment && message.attachmentUrl && (
          <div className="mt-2 flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs flex-1 truncate">
              {message.content || "Arquivo"}
            </span>
            <button
              type="button"
              onClick={() => window.open(message.attachmentUrl, "_blank")}
              className="text-primary hover:underline text-xs"
            >
              <Download className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
      {showTimestamp && (
        <div className={`flex items-center gap-1 ${isOwn ? "justify-end" : "justify-start"}`}>
          <span className="text-[11px] text-muted-foreground">{timeAgo}</span>
          {showWhatsAppIndicator && (
            <WhatsAppStatusIndicator status={message.whatsappStatus} />
          )}
        </div>
      )}
    </div>
  );
}

export function ComplaintChat({ 
  complaintId, 
  currentUserId, 
  variant = "admin",
  complaint,
  statusHistory = [],
  showInternalToggle = false, 
  defaultShowInternal = false,
  onComplement,
}: ComplaintChatProps) {
  const [inputValue, setInputValue] = useState("");
  const [isInternal, setIsInternal] = useState(defaultShowInternal);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useComplaintMessages(complaintId);
  const sendMessage = useSendComplaintMessage();
  const isComplementMode = Boolean(onComplement && complaint?.status === "RETURNED");
  const effectiveVariant: ChatVariant = variant === "admin" && showInternalToggle ? "admin" : "resident";
  const showNewChat = Boolean(complaint && statusHistory.length >= 0);
  
  // SSE for real-time updates - must be after showNewChat is defined
  useComplaintMessagesSSE({
    complaintId,
    enabled: showNewChat,
  });

  const feedItems: FeedItem[] = showNewChat
    ? buildFeedItems({
        complaint,
        messages: data?.messages ?? [],
        statusHistory,
        variant: effectiveVariant,
        currentUserId,
      })
    : [];
    ? buildFeedItems({
        complaint,
        messages: data?.messages ?? [],
        statusHistory,
        variant: effectiveVariant,
        currentUserId,
      })
    : [];

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // File attachment state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFilePreview, setPendingFilePreview] = useState<string | null>(null);

  // Reverse so oldest appears first (API returns newest-first)
  const allMessages = data?.messages ? [...data.messages].reverse() : [];
  const messages = showInternalToggle
    ? allMessages
    : allMessages.filter(m => !m.isInternal);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  const uploadAudio = async () => {
    if (!audioBlob) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");
      const response = await apiClient.post("/uploads/media", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await sendMessage.mutateAsync({
        complaintId,
        content: "🎤 Mensagem de áudio",
        attachmentUrl: response.data.url,
        isInternal: showInternalToggle ? isInternal : false,
      });
      cancelRecording();
    } catch (err) {
      console.error("Error uploading audio:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // File attachment handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    setPendingFile(file);
    if (file.type.startsWith("image/")) {
      setPendingFilePreview(URL.createObjectURL(file));
    }
    // Reset file input
    e.target.value = "";
  };

  const cancelPendingFile = () => {
    if (pendingFilePreview) {
      URL.revokeObjectURL(pendingFilePreview);
    }
    setPendingFile(null);
    setPendingFilePreview(null);
  };

  const uploadFile = async () => {
    if (!pendingFile) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", pendingFile);
      const response = await apiClient.post("/uploads/media", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const isImage = pendingFile.type.startsWith("image/");
      await sendMessage.mutateAsync({
        complaintId,
        content: isImage ? "📎 Anexo" : "📎 Anexo",
        attachmentUrl: response.data.url,
        isInternal: showInternalToggle ? isInternal : false,
      });
      cancelPendingFile();
    } catch (err) {
      console.error("Error uploading file:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || sendMessage.isPending) return;
    setInputValue("");
    try {
      if (isComplementMode && onComplement) {
        await onComplement(content);
      } else {
        await sendMessage.mutateAsync({
          complaintId,
          content,
          isInternal: showInternalToggle ? isInternal : false,
        });
      }
    } catch {
      setInputValue(content);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderFeedItem = (item: FeedItem) => {
    switch (item.kind) {
      case "date":
        return <DateSeparator key={item.id} date={item.date} />;
      case "pill":
        return (
          <SystemEventPill
            key={item.id}
            kind={item.pillKind}
            label={item.label}
            notes={item.notes}
            status={item.status}
          />
        );
      case "bubble":
        return (
          <MessageBubble
            key={item.id}
            message={item.message}
            isOwn={item.isOwn}
            isFirstInCluster={item.isFirstInCluster}
            isLastInCluster={item.isLastInCluster}
            variant={effectiveVariant}
          />
        );
      default:
        return null;
    }
  };

  const placeholder = isComplementMode
    ? "Envie um complemento para retomar a ocorrência..."
    : "Digite uma mensagem...";

  return (
    <div className={`rounded-lg border bg-background flex flex-col overflow-hidden ${showNewChat && complaint ? "h-full" : ""}`}>
      {/* Header */}
      {showNewChat && complaint ? (
        <ComplaintChatHeader complaint={complaint} variant={effectiveVariant} />
      ) : (
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Chat</span>
          </div>
          {showInternalToggle && (
            <button
              type="button"
              onClick={() => setIsInternal(!isInternal)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                isInternal
                  ? "bg-amber-100 text-amber-700 border border-amber-300"
                  : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
              }`}
              title={isInternal ? "Mensagem interna - não visível pelo morador" : "Mensagem pública"}
            >
              {isInternal ? (
                <>
                  <Lock className="h-3 w-3" />
                  <span>Interno</span>
                </>
              ) : (
                <>
                  <LockOpen className="h-3 w-3" />
                  <span>Público</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Messages area */}
      <div className={`flex flex-col gap-3 p-3 ${showNewChat ? "flex-1 overflow-y-auto" : "min-h-[160px] max-h-[320px] overflow-y-auto"}`}>
        {isLoading ? (
          <div className="flex items-center justify-center flex-1 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : showNewChat ? (
          feedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 gap-2 text-muted-foreground">
              <MessageCircle className="h-8 w-8 opacity-30" />
              <p className="text-sm text-center">
                Nenhuma mensagem ainda. Inicie a conversa!
              </p>
            </div>
          ) : (
            <>
              {feedItems.map(renderFeedItem)}
              <div ref={bottomRef} />
            </>
          )
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-8 gap-2 text-muted-foreground">
            <MessageCircle className="h-8 w-8 opacity-30" />
            <p className="text-sm text-center">
              Nenhuma mensagem ainda. Inicie a conversa!
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.senderId === currentUserId}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* File attachment preview */}
      {pendingFile && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border-t border-blue-200">
          {pendingFilePreview ? (
            <img src={pendingFilePreview} alt="Preview" className="h-12 w-12 object-cover rounded" />
          ) : (
            <Paperclip className="h-5 w-5 text-blue-600" />
          )}
          <span className="text-xs text-blue-800 flex-1 truncate">{pendingFile.name}</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={cancelPendingFile}
            className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={uploadFile}
            disabled={isUploading}
            className="h-8"
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {/* Audio Preview */}
      {audioUrl && !pendingFile && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border-t border-amber-200">
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={togglePlayback}
            className="h-8 w-8 p-0"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <span className="text-xs text-amber-800 flex-1">Áudio gravado</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={cancelRecording}
            className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={uploadAudio}
            disabled={isUploading}
            className="h-8"
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border-t border-red-200">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs text-red-700 flex-1">Gravando...</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={cancelRecording}
            className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={stopRecording}
            className="h-8 bg-red-500 hover:bg-red-600"
          >
            <MicOff className="h-4 w-4 mr-1" />
            <span>Parar</span>
          </Button>
        </div>
      )}

      {/* Hidden file input - accepts images and audio, opens photo picker on mobile */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,audio/webm,audio/mpeg,audio/mp4,audio/wav"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Input (only show when not recording and no audio/file preview) */}
      {!isRecording && !audioUrl && !pendingFile && (
        <div className="flex items-center gap-2 p-3 border-t bg-muted/10">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            className="h-9 w-9 p-0 shrink-0"
            title="Enviar foto ou arquivo"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={startRecording}
            className="h-9 w-9 p-0 shrink-0"
            title="Gravar áudio"
          >
            <Mic className="h-4 w-4" />
          </Button>
          <Input
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sendMessage.isPending}
            className="flex-1 h-9 text-sm"
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!inputValue.trim() || sendMessage.isPending}
            className="h-9 w-9 p-0 shrink-0"
            aria-label="Enviar mensagem"
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
