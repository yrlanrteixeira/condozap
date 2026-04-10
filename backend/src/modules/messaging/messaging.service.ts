import { config } from "../../config/env";
import { BadRequestError } from "../../shared/errors";
import { evolutionService } from "../evolution/evolution.service";
import { whatsappService } from "../whatsapp/whatsapp.service";
import { toWhatsAppDigits } from "../../shared/utils/phone";
import type {
  BulkSendResult,
  SendBulkInput,
  SendMessageInput,
  SendResult,
} from "./messaging.types";

class MessagingService {
  private provider: "evolution" | "official";

  constructor() {
    this.provider = config.WHATSAPP_PROVIDER;
  }

  getProvider(): string {
    return this.provider;
  }

  async isConnected(): Promise<boolean> {
    if (this.provider === "evolution") {
      return evolutionService.isConnected();
    }
    return true;
  }

  async sendText(phone: string, message: string): Promise<SendResult> {
    const normalizedPhone = toWhatsAppDigits(phone);
    try {
      if (this.provider === "evolution") {
        const response = await evolutionService.sendText({
          number: normalizedPhone,
          text: message,
        });
        return {
          success: true,
          messageId: response.key.id,
        };
      }
      const response = await whatsappService.sendTextMessage(normalizedPhone, message);
      return {
        success: true,
        messageId: response.messageId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendImage(
    phone: string,
    imageUrl: string,
    caption?: string
  ): Promise<SendResult> {
    const normalizedPhone = toWhatsAppDigits(phone);
    try {
      if (this.provider === "evolution") {
        const response = await evolutionService.sendImage(
          normalizedPhone,
          imageUrl,
          caption
        );
        return {
          success: true,
          messageId: response.key.id,
        };
      }
      throw new Error("Image sending not implemented for official API");
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendDocument(
    phone: string,
    documentUrl: string,
    fileName: string,
    caption?: string
  ): Promise<SendResult> {
    const normalizedPhone = toWhatsAppDigits(phone);
    try {
      if (this.provider === "evolution") {
        const response = await evolutionService.sendDocument(
          normalizedPhone,
          documentUrl,
          fileName,
          caption
        );
        return {
          success: true,
          messageId: response.key.id,
        };
      }
      throw new Error("Document sending not implemented for official API");
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async send(input: SendMessageInput): Promise<SendResult> {
    const {
      phone,
      message,
      type = "text",
      mediaUrl,
      caption,
      fileName,
    } = input;

    const normalizedPhone = toWhatsAppDigits(phone);

    switch (type) {
      case "image":
        if (!mediaUrl) {
          throw new BadRequestError("mediaUrl required for image");
        }
        return this.sendImage(normalizedPhone, mediaUrl, caption || message);
      case "document":
        if (!mediaUrl || !fileName) {
          throw new BadRequestError("mediaUrl and fileName required for document");
        }
        return this.sendDocument(normalizedPhone, mediaUrl, fileName, caption || message);
      case "audio":
        if (this.provider === "evolution" && mediaUrl) {
          const response = await evolutionService.sendAudio(normalizedPhone, mediaUrl);
          return { success: true, messageId: response.key.id };
        }
        throw new BadRequestError("Audio sending requires Evolution API and mediaUrl");
      case "text":
      default:
        return this.sendText(normalizedPhone, message);
    }
  }

  async sendBulk(input: SendBulkInput): Promise<BulkSendResult> {
    const { recipients, message, type = "text", mediaUrl, caption } = input;

    if (this.provider === "evolution") {
      const normalizedRecipients = recipients.map(r => ({
        ...r,
        phone: toWhatsAppDigits(r.phone)
      }));
      const result = await evolutionService.sendBatch({
        numbers: normalizedRecipients.map((resident) => resident.phone),
        text: message,
        mediaUrl: type !== "text" ? mediaUrl : undefined,
        mediaType: type !== "text" ? (type as "image" | "document") : undefined,
        caption: caption,
        delay: 2000,
      });

      return {
        total: result.total,
        sent: result.sent,
        failed: result.failed,
        results: result.results.map((item) => ({
          phone: item.number,
          success: item.success,
          messageId: item.messageId,
          error: item.error,
        })),
      };
    }

    return whatsappService.sendBulkMessages({
      recipients,
      message,
    });
  }

  async isOnWhatsApp(
    phone: string
  ): Promise<Array<{ phone: string; onWhatsApp: boolean }>> {
    if (this.provider === "evolution") {
      const result = await evolutionService.checkNumbers([phone]);
      return result.map((item) => ({
        phone: item.number,
        onWhatsApp: item.onWhatsapp,
      }));
    }
    return [{ phone, onWhatsApp: true }];
  }
}

export const messagingService = new MessagingService();
