import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/shared/hooks/useAuth";
import type { ChatMessage } from "./useComplaintChatApi";
import { queryKeys } from "../utils/queryKeys";
import { config } from "@/lib/config";

interface UseComplaintMessagesSSEOptions {
  complaintId: number | null;
  enabled?: boolean;
}

export function useComplaintMessagesSSE({
  complaintId,
  enabled = true,
}: UseComplaintMessagesSSEOptions) {
  const queryClient = useQueryClient();
  const { user, token } = useAuth();
  const eventSourceRef = useRef<EventSource | null>(null);
  const onMessageRef = useRef<((message: ChatMessage) => void) | null>(null);

  const setOnMessage = useCallback((callback: (message: ChatMessage) => void) => {
    onMessageRef.current = callback;
  }, []);

  useEffect(() => {
    if (!enabled || !complaintId || complaintId <= 0 || !user?.id || !token) {
      return;
    }

    // Clean up previous connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(
      `${config.apiUrl}/complaint-messages/${complaintId}/stream?token=${token}`,
      {
        withCredentials: true,
      }
    );

    eventSourceRef.current = eventSource;

    eventSource.addEventListener("connected", (event) => {
      console.log("SSE connected for complaint:", complaintId);
    });

    eventSource.addEventListener("new_message", (event) => {
      try {
        const message: ChatMessage = JSON.parse(event.data);
        
        // Update React Query cache directly
        queryClient.setQueryData<{ messages: ChatMessage[] }>(
          queryKeys.complaintMessages(complaintId),
          (old) => {
            if (!old) return old;
            // Avoid duplicates
            const exists = old.messages.some((m) => m.id === message.id);
            if (exists) return old;
            return {
              ...old,
              messages: [...old.messages, message],
            };
          }
        );

        // Also call the callback if set
        if (onMessageRef.current) {
          onMessageRef.current(message);
        }
      } catch (e) {
        console.error("Failed to parse SSE message:", e);
      }
    });

    eventSource.onerror = (event) => {
      console.error("SSE error:", event);
      // Reconnect after delay
      setTimeout(() => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      }, 5000);
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [complaintId, enabled, user?.id, token, queryClient]);

  return {
    setOnMessage,
  };
}

export function getSSEConnection() {
  return eventSourceRef.current;
}