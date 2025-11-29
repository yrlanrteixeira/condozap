/**
 * Messages Feature - Public API
 */

// Hooks
export * from "./hooks/useMessagesApi";

// Types
export type {
  Message,
  MessageType,
  MessageScope,
  WhatsAppStatus,
  SendMessageInput,
  SendWhatsAppMessageInput,
  SendBulkMessagesInput,
  MessageFilters,
  MessageStats,
  MessageStatsPeriod,
} from "./types";

// Schemas
export { MessageSchema, SendMessageSchema } from "./schemas";

// Utils
export { queryKeys as messagesQueryKeys } from "./utils/queryKeys";

// Pages
export { MessagingPage } from "./pages/MessagingPage";
