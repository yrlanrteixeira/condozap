import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface ChatMessage {
  id: string;
  senderId: string;
  senderRole: string;
  senderName: string;
  content: string;
  attachmentUrl: string | null;
  source: "WEB" | "WHATSAPP";
  isInternal: boolean;
  createdAt: string;
}

interface ChatResponse {
  messages: ChatMessage[];
  nextCursor: string | null;
}

export type { ChatMessage, ChatResponse };

export function useComplaintMessages(complaintId: number | null) {
  return useQuery<ChatResponse>({
    queryKey: ["complaint-messages", complaintId],
    queryFn: async () => {
      const { data } = await api.get(`/complaint-messages/${complaintId}`);
      return data;
    },
    enabled: !!complaintId && complaintId > 0,
    refetchInterval: 15_000, // Poll every 15 seconds
  });
}

export function useSendComplaintMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      complaintId,
      content,
      isInternal,
      attachmentUrl,
    }: {
      complaintId: number;
      content: string;
      isInternal?: boolean;
      attachmentUrl?: string;
    }) => {
      const { data } = await api.post(`/complaint-messages/${complaintId}`, {
        content,
        ...(isInternal && { isInternal }),
        ...(attachmentUrl && { attachmentUrl }),
      });
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: ["complaint-messages", variables.complaintId],
      });
    },
  });
}
