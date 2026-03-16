import axios from "axios";
import type { PrismaClient, WhatsAppStatus } from "@prisma/client";
import type { FastifyBaseLogger } from "fastify";
import { config } from "../../config/env";
import { evolutionService } from "../evolution/evolution.service";
import type { WhatsAppWebhookBody } from "./whatsapp.schema";
import { updateMessageStatus } from "./whatsapp.repository";

export interface WhatsAppMessage {
  to: string;
  message: string;
  type?: "text" | "template";
}

export interface BulkMessage {
  recipients: Array<{ phone: string; name: string }>;
  message: string;
}

const normalizeWhatsAppStatus = (status: string): WhatsAppStatus | null => {
  if (status === "SENT") {
    return "SENT";
  }
  if (status === "DELIVERED") {
    return "DELIVERED";
  }
  if (status === "READ") {
    return "READ";
  }
  if (status === "FAILED") {
    return "FAILED";
  }
  return null;
};

export class WhatsAppService {
  private readonly baseUrl = config.WHATSAPP_API_URL;
  private readonly phoneNumberId = config.WHATSAPP_PHONE_NUMBER_ID;
  private readonly accessToken = config.WHATSAPP_ACCESS_TOKEN;
  private readonly provider = config.WHATSAPP_PROVIDER;

  async sendTextMessage(
    to: string,
    message: string
  ): Promise<{ messageId: string }> {
    if (this.provider === "evolution") {
      try {
        const response = await evolutionService.sendText({
          number: to,
          text: message,
        });

        return {
          messageId: response.key.id,
        };
      } catch (error: any) {
        throw new Error(
          `Failed to send WhatsApp message via Evolution: ${error.message}`
        );
      }
    }

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to.replace(/\D/g, ""),
      type: "text",
      text: {
        preview_url: false,
        body: message,
      },
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        messageId: response.data.messages[0].id,
      };
    } catch (error: any) {
      throw new Error(
        `Failed to send WhatsApp message: ${
          error.response?.data?.error?.message || error.message
        }`
      );
    }
  }

  async sendBulkMessages(bulkMessage: BulkMessage): Promise<{
    total: number;
    sent: number;
    failed: number;
    results: Array<{
      phone: string;
      success: boolean;
      messageId?: string;
      error?: string;
    }>;
  }> {
    if (this.provider === "evolution") {
      try {
        const numbers = bulkMessage.recipients.map(
          (resident) => resident.phone
        );
        const result = await evolutionService.sendBatch({
          numbers,
          text: bulkMessage.message,
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
      } catch (error: any) {
        throw new Error(
          `Failed to send bulk messages via Evolution: ${error.message}`
        );
      }
    }

    const RATE_LIMIT = 50;
    const RATE_INTERVAL_MS = 1000;

    const results: Array<{
      phone: string;
      success: boolean;
      messageId?: string;
      error?: string;
    }> = [];
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < bulkMessage.recipients.length; i++) {
      const recipient = bulkMessage.recipients[i];

      try {
        const result = await this.sendTextMessage(
          recipient.phone,
          bulkMessage.message
        );
        results.push({
          phone: recipient.phone,
          success: true,
          messageId: result.messageId,
        });
        sent++;
      } catch (error: any) {
        results.push({
          phone: recipient.phone,
          success: false,
          error: error.message,
        });
        failed++;
      }

      if (
        i > 0 &&
        i % RATE_LIMIT === 0 &&
        i < bulkMessage.recipients.length - 1
      ) {
        await new Promise((resolve) => setTimeout(resolve, RATE_INTERVAL_MS));
      }
    }

    return {
      total: bulkMessage.recipients.length,
      sent,
      failed,
      results,
    };
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    components: any[]
  ): Promise<{ messageId: string }> {
    const payload = {
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ""),
      type: "template",
      template: {
        name: templateName,
        language: { code: "pt_BR" },
        components,
      },
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        messageId: response.data.messages[0].id,
      };
    } catch (error: any) {
      throw new Error(
        `Failed to send template message: ${
          error.response?.data?.error?.message || error.message
        }`
      );
    }
  }
}

export const updateMessageStatuses = async (
  prisma: PrismaClient,
  body: WhatsAppWebhookBody,
  logger: FastifyBaseLogger
): Promise<void> => {
  const statuses = body.entry?.[0]?.changes?.[0]?.value?.statuses ?? [];
  if (statuses.length === 0) {
    logger.info("No WhatsApp statuses to process");
    return;
  }
  for (const status of statuses) {
    const messageId = status.id;
    const normalizedStatus = status.status
      ? status.status.toUpperCase()
      : undefined;
    if (!messageId || !normalizedStatus) {
      continue;
    }
    const allowedStatus = normalizeWhatsAppStatus(normalizedStatus);
    if (!allowedStatus) {
      continue;
    }
    await updateMessageStatus(prisma, messageId, allowedStatus);
    logger.info(`Updated message ${messageId} status to ${allowedStatus}`);
  }
};

export const whatsappService = new WhatsAppService();
