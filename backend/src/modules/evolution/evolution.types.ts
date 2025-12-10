export interface EvolutionInstance {
  instanceName: string;
  instanceId?: string;
  integration?: "WHATSAPP-BAILEYS" | "WHATSAPP-BUSINESS";
  token?: string;
  number?: string;
  status?: "open" | "close" | "connecting";
  owner?: string;
  profileName?: string;
  profilePictureUrl?: string;
}

export interface CreateInstanceInput {
  instanceName: string;
  token?: string;
  number?: string;
  qrcode?: boolean;
  integration?: "WHATSAPP-BAILEYS" | "WHATSAPP-BUSINESS";
  webhook?: string;
  webhookByEvents?: boolean;
  webhookBase64?: boolean;
  webhookEvents?: string[];
}

export interface InstanceStateResponse {
  instance: {
    instanceName: string;
    state: "open" | "close" | "connecting";
  };
}

export interface QRCodeResponse {
  pairingCode?: string;
  code?: string;
  base64?: string;
  count?: number;
}

export interface SendTextInput {
  number: string;
  text: string;
  delay?: number;
  quoted?: QuotedMessage;
  linkPreview?: boolean;
  mentionsEveryOne?: boolean;
  mentioned?: string[];
}

export interface SendMediaInput {
  number: string;
  mediatype: "image" | "video" | "audio" | "document";
  mimetype?: string;
  caption?: string;
  media: string;
  fileName?: string;
  delay?: number;
  quoted?: QuotedMessage;
  mentionsEveryOne?: boolean;
  mentioned?: string[];
}

export interface SendTemplateInput {
  number: string;
  name: string;
  language: string;
  components?: TemplateComponent[];
}

export interface TemplateComponent {
  type: "header" | "body" | "button";
  parameters?: TemplateParameter[];
}

export interface TemplateParameter {
  type: "text" | "currency" | "date_time" | "image" | "document" | "video";
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
  image?: { link: string };
  document?: { link: string; filename?: string };
  video?: { link: string };
}

export interface QuotedMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
    participant?: string;
  };
  message: {
    conversation?: string;
  };
}

export interface SendMessageResponse {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: {
    extendedTextMessage?: {
      text: string;
    };
    conversation?: string;
  };
  messageTimestamp: string;
  status: string;
}

export interface CheckNumberInput {
  numbers: string[];
}

export interface CheckNumberResponse {
  onWhatsapp: boolean;
  jid: string;
  number: string;
}

export type WebhookEventType =
  | "APPLICATION_STARTUP"
  | "QRCODE_UPDATED"
  | "CONNECTION_UPDATE"
  | "MESSAGES_SET"
  | "MESSAGES_UPSERT"
  | "MESSAGES_UPDATE"
  | "MESSAGES_DELETE"
  | "SEND_MESSAGE"
  | "CONTACTS_SET"
  | "CONTACTS_UPSERT"
  | "CONTACTS_UPDATE"
  | "PRESENCE_UPDATE"
  | "CHATS_SET"
  | "CHATS_UPSERT"
  | "CHATS_UPDATE"
  | "CHATS_DELETE"
  | "GROUPS_UPSERT"
  | "GROUP_UPDATE"
  | "GROUP_PARTICIPANTS_UPDATE"
  | "CALL"
  | "TYPEBOT_START"
  | "TYPEBOT_CHANGE_STATUS";

export interface WebhookPayload {
  event: WebhookEventType;
  instance: string;
  data: unknown;
  destination?: string;
  date_time?: string;
  sender?: string;
  server_url?: string;
  apikey?: string;
}

export interface MessageWebhookData {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  pushName?: string;
  message?: {
    conversation?: string;
    extendedTextMessage?: {
      text: string;
    };
    imageMessage?: {
      url: string;
      mimetype: string;
      caption?: string;
    };
    documentMessage?: {
      url: string;
      mimetype: string;
      fileName: string;
    };
  };
  messageType?: string;
  messageTimestamp?: number;
  instanceId?: string;
  source?: string;
}

export interface EvolutionError {
  status: number;
  error: string;
  message: string | string[];
}

export interface BatchMessageInput {
  numbers: string[];
  text?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio" | "document";
  caption?: string;
  delay?: number;
}

export interface BatchMessageResult {
  total: number;
  sent: number;
  failed: number;
  results: {
    number: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }[];
}

