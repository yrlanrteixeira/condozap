export interface SendMessageInput {
  phone: string;
  message: string;
  type?: "text" | "image" | "document" | "audio";
  mediaUrl?: string;
  caption?: string;
  fileName?: string;
}

export interface SendBulkInput {
  recipients: Array<{ phone: string; name: string }>;
  message: string;
  type?: "text" | "image" | "document";
  mediaUrl?: string;
  caption?: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BulkSendResult {
  total: number;
  sent: number;
  failed: number;
  results: Array<{
    phone: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
}

