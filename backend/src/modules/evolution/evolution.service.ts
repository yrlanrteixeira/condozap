import { config } from "../../config/env";
import type {
  SendTextInput,
  SendMediaInput,
  SendMessageResponse,
  CheckNumberResponse,
  InstanceStateResponse,
  QRCodeResponse,
  BatchMessageInput,
  BatchMessageResult,
  EvolutionError,
} from "./evolution.schema";

class EvolutionService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly instanceName: string;

  constructor() {
    this.baseUrl = config.EVOLUTION_API_URL;
    this.apiKey = config.EVOLUTION_API_KEY || "";
    this.instanceName = config.EVOLUTION_INSTANCE_NAME;
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      apikey: this.apiKey,
    };
  }

  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const options: RequestInit = {
      method,
      headers: this.getHeaders(),
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const raw = await response.text();

    let data: unknown = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = raw;
      }
    }

    if (!response.ok) {
      if (typeof data === "object" && data !== null) {
        const error = data as EvolutionError;
        throw new Error(
          Array.isArray(error.message)
            ? error.message.join(", ")
            : error.message || "Evolution API error"
        );
      }
      throw new Error(
        `Evolution API error (${response.status}): ${String(data || "empty response")}`
      );
    }

    return data as T;
  }

  private async ensureConnected(): Promise<void> {
    const state = await this.getInstanceState();
    if (state.instance.state !== "open") {
      throw new Error(
        `Evolution instance '${this.instanceName}' is not connected (state: ${state.instance.state})`
      );
    }
  }

  private validateSendResponse(response: SendMessageResponse): SendMessageResponse {
    const messageId = response?.key?.id;
    if (!messageId) {
      throw new Error("Evolution API did not return a valid message id");
    }

    const status = response?.status?.toUpperCase?.() ?? "";
    if (status === "FAILED" || status === "ERROR") {
      throw new Error(`Evolution API returned unsuccessful status: ${response.status}`);
    }

    return response;
  }

  async getInstanceState(): Promise<InstanceStateResponse> {
    return this.request<InstanceStateResponse>(
      `/instance/connectionState/${this.instanceName}`
    );
  }

  async getQRCode(): Promise<QRCodeResponse> {
    return this.request<QRCodeResponse>(
      `/instance/connect/${this.instanceName}`
    );
  }

  async disconnect(): Promise<{ status: string }> {
    return this.request<{ status: string }>(
      `/instance/logout/${this.instanceName}`,
      "DELETE"
    );
  }

  async restart(): Promise<{ status: string }> {
    return this.request<{ status: string }>(
      `/instance/restart/${this.instanceName}`,
      "PUT"
    );
  }

  async sendText(input: SendTextInput): Promise<SendMessageResponse> {
    await this.ensureConnected();
    const formattedNumber = this.formatPhoneNumber(input.number);

    const response = await this.request<SendMessageResponse>(
      `/message/sendText/${this.instanceName}`,
      "POST",
      {
        number: formattedNumber,
        text: input.text,
        delay: input.delay || 1200,
        linkPreview: input.linkPreview ?? true,
      }
    );

    return this.validateSendResponse(response);
  }

  async sendMedia(input: SendMediaInput): Promise<SendMessageResponse> {
    await this.ensureConnected();
    const formattedNumber = this.formatPhoneNumber(input.number);

    const response = await this.request<SendMessageResponse>(
      `/message/sendMedia/${this.instanceName}`,
      "POST",
      {
        number: formattedNumber,
        mediatype: input.mediatype,
        mimetype: input.mimetype,
        caption: input.caption,
        media: input.media,
        fileName: input.fileName,
        delay: input.delay || 1200,
      }
    );

    return this.validateSendResponse(response);
  }

  async sendImage(
    number: string,
    imageUrl: string,
    caption?: string
  ): Promise<SendMessageResponse> {
    return this.sendMedia({
      number,
      mediatype: "image",
      media: imageUrl,
      caption,
    });
  }

  async sendDocument(
    number: string,
    documentUrl: string,
    fileName: string,
    caption?: string
  ): Promise<SendMessageResponse> {
    return this.sendMedia({
      number,
      mediatype: "document",
      media: documentUrl,
      fileName,
      caption,
    });
  }

  async sendAudio(
    number: string,
    audioUrl: string
  ): Promise<SendMessageResponse> {
    return this.sendMedia({
      number,
      mediatype: "audio",
      media: audioUrl,
    });
  }

  async checkNumbers(numbers: string[]): Promise<CheckNumberResponse[]> {
    const formattedNumbers = numbers.map((number) =>
      this.formatPhoneNumber(number)
    );

    return this.request<CheckNumberResponse[]>(
      `/chat/whatsappNumbers/${this.instanceName}`,
      "POST",
      { numbers: formattedNumbers }
    );
  }

  async isOnWhatsApp(number: string): Promise<boolean> {
    try {
      const results = await this.checkNumbers([number]);
      return results.length > 0 && results[0].onWhatsapp;
    } catch {
      return false;
    }
  }

  async sendBatch(input: BatchMessageInput): Promise<BatchMessageResult> {
    const results: BatchMessageResult = {
      total: input.numbers.length,
      sent: 0,
      failed: 0,
      results: [],
    };

    const delay = input.delay || 2000;

    for (const number of input.numbers) {
      try {
        let response: SendMessageResponse;

        if (input.mediaUrl && input.mediaType) {
          response = await this.sendMedia({
            number,
            mediatype: input.mediaType,
            media: input.mediaUrl,
            caption: input.caption || input.text,
          });
        } else if (input.text) {
          response = await this.sendText({
            number,
            text: input.text,
          });
        } else {
          throw new Error("No text or media provided");
        }

        const messageId = response.key.id;
        results.sent++;
        results.results.push({
          number,
          success: true,
          messageId,
        });

        if (input.numbers.indexOf(number) < input.numbers.length - 1) {
          await this.sleep(delay);
        }
      } catch (error: any) {
        results.failed++;
        results.results.push({
          number,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, "");

    // Já está no formato internacional brasileiro (12 = fixo, 13 = celular)
    if (cleaned.startsWith("55") && (cleaned.length === 12 || cleaned.length === 13)) {
      return cleaned;
    }

    // Número nacional (10 = fixo, 11 = celular com 9): adiciona prefixo 55
    if (cleaned.length === 10 || cleaned.length === 11) {
      cleaned = `55${cleaned}`;
    }

    return cleaned;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async isConnected(): Promise<boolean> {
    try {
      const state = await this.getInstanceState();
      return state.instance.state === "open";
    } catch {
      return false;
    }
  }
}

export const evolutionService = new EvolutionService();
