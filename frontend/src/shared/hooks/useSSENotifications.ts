import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { useToast } from "@/shared/components/ui/use-toast";

export function useSSENotifications() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);

  const scheduleReconnect = useCallback((connectFn: () => void) => {
    if (reconnectTimeoutRef.current || !user?.id) return;
    const attempt = reconnectAttemptsRef.current;
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
    const jitter = Math.random() * 1000;
    reconnectAttemptsRef.current = attempt + 1;
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      if (user?.id && token) connectFn();
    }, delay + jitter);
  }, [user?.id, token]);

  const connect = useCallback(() => {
    if (!user?.id || !token) return;

    // Cancelar conexão anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const baseUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:3001";
    const url = `${baseUrl}/sse?token=${encodeURIComponent(token)}`;
    
    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    }).then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      if (!response.body) {
        throw new Error("No response body");
      }

      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
      console.log("[SSE] Conectado para notificações");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      function read() {
        reader.read().then(({ done, value }) => {
          if (done || controller.signal.aborted) {
            setIsConnected(false);
            if (!controller.signal.aborted) {
              scheduleReconnect(connect);
            }
            return;
          }

          const chunk = decoder.decode(value, { stream: true });
          const events = chunk.split("\n\n");

          for (const event of events) {
            if (!event.trim() || event.startsWith(":")) continue; // heartbeat

            const lines = event.split("\n");
            let eventType = "";
            let eventData = "";

            for (const line of lines) {
              if (line.startsWith("event:")) {
                eventType = line.slice(6).trim();
              } else if (line.startsWith("data:")) {
                eventData = line.slice(5).trim();
              }
            }

            if (eventType && eventData) {
              try {
                const data = JSON.parse(eventData);
                console.log(`[SSE] Evento ${eventType}:`, data);

                if (eventType === "new_complaint") {
                  queryClient.invalidateQueries({ queryKey: ["complaints"] });
                  toast({
                    title: "Nova ocorrência!",
                    description: `Categoria: ${data.category}`,
                    variant: "default",
                    duration: 8000,
                  });
                  playNotificationSound();
                } else if (eventType === "complaint_assigned") {
                  queryClient.invalidateQueries({ queryKey: ["complaints"] });
                  toast({
                    title: "Ocorrência atribuída",
                    description: "Você foi atribuído a uma nova ocorrência",
                    variant: "default",
                    duration: 5000,
                  });
                  playNotificationSound();
                } else if (eventType === "notification") {
                  queryClient.invalidateQueries({ queryKey: ["notifications"] });
                  queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
                  toast({
                    title: data.title ?? "Notificação",
                    description: data.body ?? "",
                    variant: "default",
                    duration: 6000,
                  });
                  playNotificationSound();
                }
              } catch (err) {
                console.error("[SSE] Erro ao processar evento:", err);
              }
            }
          }

          read();
        }).catch((err) => {
          setIsConnected(false);
          if (controller.signal.aborted) return;
          console.error("[SSE] Erro lendo stream:", err);
          scheduleReconnect(connect);
        });
      }

      read();
    }).catch((err) => {
      setIsConnected(false);
      if (err.name !== "AbortError") {
        console.log("[SSE] Erro na conexão:", err.message);
        scheduleReconnect(connect);
      }
    });
  }, [user, token, queryClient, toast, scheduleReconnect]);

  useEffect(() => {
    if (user?.id && token) {
      connect();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user?.id, token, connect]);

  return { reconnect: connect, isConnected };
}

function playNotificationSound() {
  try {
    const audio = new Audio("/notification.mp3");
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {}
}