import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "./useAppSelector";
import { useToast } from "@/shared/components/ui/use-toast";
import { selectToken } from "@/shared/store/slices/authSlice";

export function useRealtimeNotifications() {
  const token = useAppSelector(selectToken);
  const userId = useAppSelector((state) => state.user.currentUser?.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!userId || !token) {
      console.log("[SSE] Sem token ou userId, pulando conexão");
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const baseUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:3001";
    const url = `${baseUrl}/sse?token=${encodeURIComponent(token)}`;
    
    console.log("[SSE] Conectando em:", url);
    
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

      console.log("[SSE] Conectado!");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      function read() {
        reader.read().then(({ done, value }) => {
          if (done || controller.signal.aborted) {
            return;
          }

          const chunk = decoder.decode(value, { stream: true });
          const events = chunk.split("\n\n");

          for (const event of events) {
            if (!event.trim() || event.startsWith(":")) continue;

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
                }
              } catch (err) {
                console.error("[SSE] Erro:", err);
              }
            }
          }

          read();
        });
      }

      read();
    }).catch((err) => {
      if (err.name !== "AbortError") {
        console.log("[SSE] Erro:", err.message);
        
        if (!reconnectTimeoutRef.current && userId) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            if (userId && token) {
              connect();
            }
          }, 5000);
        }
      }
    });
  }, [userId, token, queryClient, toast]);

  useEffect(() => {
    if (userId && token) {
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
  }, [userId, token, connect]);
}

function playNotificationSound() {
  try {
    const audio = new Audio("/notification.mp3");
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {}
}