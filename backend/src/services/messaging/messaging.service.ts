/**
 * Messaging Service
 * 
 * Serviço unificado para envio de mensagens via WhatsApp.
 * Suporta Evolution API (Baileys) e API Oficial do WhatsApp Business.
 * 
 * Configuração via WHATSAPP_PROVIDER no .env:
 * - 'evolution': Usa Evolution API (gratuito, não oficial)
 * - 'official': Usa WhatsApp Business API (oficial, pago)
 */

import { config } from '../../config/env.js';
import { evolutionService } from '../evolution/index.js';
import { whatsappService } from '../whatsapp.service.js';

export interface SendMessageInput {
  phone: string;
  message: string;
  type?: 'text' | 'image' | 'document' | 'audio';
  mediaUrl?: string;
  caption?: string;
  fileName?: string;
}

export interface SendBulkInput {
  recipients: Array<{ phone: string; name: string }>;
  message: string;
  type?: 'text' | 'image' | 'document';
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

class MessagingService {
  private provider: 'evolution' | 'official';

  constructor() {
    this.provider = config.WHATSAPP_PROVIDER;
  }

  /**
   * Retorna o provider atual
   */
  getProvider(): string {
    return this.provider;
  }

  /**
   * Verifica se o serviço está conectado/disponível
   */
  async isConnected(): Promise<boolean> {
    if (this.provider === 'evolution') {
      return evolutionService.isConnected();
    }
    // Para API oficial, assumimos que está sempre disponível se configurada
    return true;
  }

  /**
   * Envia uma mensagem de texto
   */
  async sendText(phone: string, message: string): Promise<SendResult> {
    try {
      if (this.provider === 'evolution') {
        const response = await evolutionService.sendText({
          number: phone,
          text: message,
        });
        return {
          success: true,
          messageId: response.key.id,
        };
      } else {
        const response = await whatsappService.sendTextMessage(phone, message);
        return {
          success: true,
          messageId: response.messageId,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Envia uma imagem
   */
  async sendImage(phone: string, imageUrl: string, caption?: string): Promise<SendResult> {
    try {
      if (this.provider === 'evolution') {
        const response = await evolutionService.sendImage(phone, imageUrl, caption);
        return {
          success: true,
          messageId: response.key.id,
        };
      } else {
        // API oficial não implementa imagem diretamente
        throw new Error('Image sending not implemented for official API');
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Envia um documento
   */
  async sendDocument(
    phone: string,
    documentUrl: string,
    fileName: string,
    caption?: string
  ): Promise<SendResult> {
    try {
      if (this.provider === 'evolution') {
        const response = await evolutionService.sendDocument(phone, documentUrl, fileName, caption);
        return {
          success: true,
          messageId: response.key.id,
        };
      } else {
        throw new Error('Document sending not implemented for official API');
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Envia mensagem genérica (text, image, document)
   */
  async send(input: SendMessageInput): Promise<SendResult> {
    const { phone, message, type = 'text', mediaUrl, caption, fileName } = input;

    switch (type) {
      case 'image':
        if (!mediaUrl) throw new Error('mediaUrl required for image');
        return this.sendImage(phone, mediaUrl, caption || message);
      
      case 'document':
        if (!mediaUrl || !fileName) throw new Error('mediaUrl and fileName required for document');
        return this.sendDocument(phone, mediaUrl, fileName, caption || message);
      
      case 'audio':
        if (this.provider === 'evolution' && mediaUrl) {
          const response = await evolutionService.sendAudio(phone, mediaUrl);
          return { success: true, messageId: response.key.id };
        }
        throw new Error('Audio sending requires Evolution API and mediaUrl');
      
      case 'text':
      default:
        return this.sendText(phone, message);
    }
  }

  /**
   * Envia mensagens em lote
   */
  async sendBulk(input: SendBulkInput): Promise<BulkSendResult> {
    const { recipients, message, type = 'text', mediaUrl, caption } = input;

    if (this.provider === 'evolution') {
      // Usa o batch da Evolution API
      const result = await evolutionService.sendBatch({
        numbers: recipients.map(r => r.phone),
        text: message,
        mediaUrl: type !== 'text' ? mediaUrl : undefined,
        mediaType: type !== 'text' ? type as 'image' | 'document' : undefined,
        caption: caption,
        delay: 2000, // 2 segundos entre mensagens
      });

      return {
        total: result.total,
        sent: result.sent,
        failed: result.failed,
        results: result.results,
      };
    } else {
      // Usa o bulk da API oficial
      return whatsappService.sendBulkMessages({
        recipients,
        message,
      });
    }
  }

  /**
   * Verifica se um número está no WhatsApp (apenas Evolution)
   */
  async isOnWhatsApp(phone: string): Promise<boolean> {
    if (this.provider === 'evolution') {
      return evolutionService.isOnWhatsApp(phone);
    }
    // API oficial não suporta essa verificação
    return true;
  }

  /**
   * Verifica múltiplos números (apenas Evolution)
   */
  async checkNumbers(phones: string[]): Promise<Array<{ phone: string; onWhatsApp: boolean }>> {
    if (this.provider === 'evolution') {
      const results = await evolutionService.checkNumbers(phones);
      return results.map(r => ({
        phone: r.number,
        onWhatsApp: r.onWhatsapp,
      }));
    }
    // API oficial não suporta
    return phones.map(phone => ({ phone, onWhatsApp: true }));
  }
}

// Singleton export
export const messagingService = new MessagingService();

