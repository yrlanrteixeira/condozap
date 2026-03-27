import { useRef, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send, MessageCircle, Loader2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  useComplaintMessages,
  useSendComplaintMessage,
} from "../hooks/useComplaintChatApi";
import type { ChatMessage } from "../hooks/useComplaintChatApi";

interface ComplaintChatProps {
  complaintId: number;
  currentUserId: string;
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

function MessageBubble({
  message,
  isOwn,
}: {
  message: ChatMessage;
  isOwn: boolean;
}) {
  const timeAgo = formatDistanceToNow(new Date(message.createdAt), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <div className={`flex flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}>
      <div className={`flex items-center gap-1.5 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
        <span className="text-xs font-medium text-foreground">
          {message.senderName}
        </span>
        <RoleBadge role={message.senderRole} />
        {message.source === "WHATSAPP" && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 leading-tight bg-emerald-50 text-emerald-700 border-emerald-200"
          >
            WhatsApp
          </Badge>
        )}
      </div>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed break-words ${
          isOwn
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted text-foreground rounded-tl-sm"
        }`}
      >
        {message.content}
      </div>
      <span className="text-[11px] text-muted-foreground">{timeAgo}</span>
    </div>
  );
}

export function ComplaintChat({ complaintId, currentUserId }: ComplaintChatProps) {
  const [inputValue, setInputValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useComplaintMessages(complaintId);
  const sendMessage = useSendComplaintMessage();

  // Reverse so oldest appears first (API returns newest-first)
  const messages = data?.messages ? [...data.messages].reverse() : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || sendMessage.isPending) return;
    setInputValue("");
    try {
      await sendMessage.mutateAsync({ complaintId, content });
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

  return (
    <div className="rounded-lg border bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
        <MessageCircle className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Chat</span>
      </div>

      {/* Messages area */}
      <div className="flex flex-col gap-3 p-3 min-h-[160px] max-h-[320px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center flex-1 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
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

      {/* Input */}
      <div className="flex items-center gap-2 p-3 border-t bg-muted/10">
        <Input
          placeholder="Digite uma mensagem..."
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
    </div>
  );
}
