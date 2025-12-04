/**
 * Evolution API Service
 *
 * Serviço para integração com Evolution API v2
 * Documentação: https://doc.evolution-api.com/v2/pt/get-started/introduction
 */

import { config } from "../../config/env.js";
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
} from "./types.js";

class EvolutionService {
  private baseUrl: string;
  private apiKey: string;
  private instanceName: string;

  constructor() {
    this.baseUrl = config.EVOLUTION_API_URL;
    this.apiKey = config.EVOLUTION_API_KEY || "";
    this.instanceName = config.EVOLUTION_INSTANCE_NAME;
  }

  /**
   * Headers padrão para requisições
   */
  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      apikey: this.apiKey,
    };
  }

  /**
   * Faz requisição para a Evolution API
   */
  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: any
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
    const data = await response.json();

    if (!response.ok) {
      const error = data as EvolutionError;
      throw new Error(
        Array.isArray(error.message)
          ? error.message.join(", ")
          : error.message || "Evolution API error"
      );
    }

    return data as T;
  }

  // =====================================================
  // Instance Methods
  // =====================================================

  /**
   * Verifica o estado da instância
   */
  async getInstanceState(): Promise<InstanceStateResponse> {
    return this.request<InstanceStateResponse>(
      `/instance/connectionState/${this.instanceName}`
    );
  }

  /**
   * Obtém QR Code para conexão
   */
  async getQRCode(): Promise<QRCodeResponse> {
    return this.request<QRCodeResponse>(
      `/instance/connect/${this.instanceName}`
    );
  }

  /**
   * Desconecta a instância
   */
  async disconnect(): Promise<{ status: string }> {
    return this.request<{ status: string }>(
      `/instance/logout/${this.instanceName}`,
      "DELETE"
    );
  }

  /**
   * Reinicia a instância
   */
  async restart(): Promise<{ status: string }> {
    return this.request<{ status: string }>(
      `/instance/restart/${this.instanceName}`,
      "PUT"
    );
  }

  // =====================================================
  // Message Methods
  // =====================================================

  /**
   * Envia mensagem de texto
   */
  async sendText(input: SendTextInput): Promise<SendMessageResponse> {
    const formattedNumber = this.formatPhoneNumber(input.number);

    return this.request<SendMessageResponse>(
      `/message/sendText/${this.instanceName}`,
      "POST",
      {
        number: formattedNumber,
        text: input.text,
        delay: input.delay || 1200, // Delay padrão de 1.2s para parecer humano
        linkPreview: input.linkPreview ?? true,
      }
    );
  }

  /**
   * Envia mídia (imagem, vídeo, áudio, documento)
   */
  async sendMedia(input: SendMediaInput): Promise<SendMessageResponse> {
    const formattedNumber = this.formatPhoneNumber(input.number);

    return this.request<SendMessageResponse>(
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
  }

  /**
   * Envia imagem
   */
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

  /**
   * Envia documento
   */
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

  /**
   * Envia áudio
   */
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

  // =====================================================
  // Contact Methods
  // =====================================================

  /**
   * Verifica se números estão no WhatsApp
   */
  async checkNumbers(numbers: string[]): Promise<CheckNumberResponse[]> {
    const formattedNumbers = numbers.map((n) => this.formatPhoneNumber(n));

    return this.request<CheckNumberResponse[]>(
      `/chat/whatsappNumbers/${this.instanceName}`,
      "POST",
      { numbers: formattedNumbers }
    );
  }

  /**
   * Verifica se um número está no WhatsApp
   */
  async isOnWhatsApp(number: string): Promise<boolean> {
    try {
      const results = await this.checkNumbers([number]);
      return results.length > 0 && results[0].onWhatsapp;
    } catch {
      return false;
    }
  }

  // =====================================================
  // Batch Message Methods
  // =====================================================

  /**
   * Envia mensagem em lote para múltiplos números
   */
  async sendBatch(input: BatchMessageInput): Promise<BatchMessageResult> {
    const results: BatchMessageResult = {
      total: input.numbers.length,
      sent: 0,
      failed: 0,
      results: [],
    };

    const delay = input.delay || 2000; // 2 segundos entre mensagens

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

        results.sent++;
        results.results.push({
          number,
          success: true,
          messageId: response.key.id,
        });

        // Delay entre mensagens para evitar bloqueio
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

  // =====================================================
  // Utility Methods
  // =====================================================

  /**
   * Formata número de telefone para o padrão do WhatsApp
   * Remove caracteres especiais e adiciona código do país se necessário
   */
  private formatPhoneNumber(phone: string): string {
    // Remove todos os caracteres não numéricos
    let cleaned = phone.replace(/\D/g, "");

    // Remove o 9 extra se for um número brasileiro com 13 dígitos
    // Formato: 55 + DDD (2) + 9 + número (8) = 13 dígitos
    if (cleaned.length === 13 && cleaned.startsWith("55")) {
      const ddd = cleaned.substring(2, 4);
      const number = cleaned.substring(5); // Remove o 9
      cleaned = `55${ddd}${number}`;
    }

    // Se não tem código do país (55), adiciona
    if (cleaned.length === 10 || cleaned.length === 11) {
      cleaned = `55${cleaned}`;
    }

    return cleaned;
  }

  /**
   * Aguarda um tempo em ms
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Verifica se a instância está conectada
   */
  async isConnected(): Promise<boolean> {
    try {
      const state = await this.getInstanceState();
      return state.instance.state === "open";
    } catch {
      return false;
    }
  }
}

// Singleton export
export const evolutionService = new EvolutionService();
