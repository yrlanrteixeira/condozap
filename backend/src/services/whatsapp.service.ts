import axios from 'axios'
import { config } from '../config/env.js'

export interface WhatsAppMessage {
  to: string
  message: string
  type?: 'text' | 'template'
}

export interface BulkMessage {
  recipients: Array<{ phone: string; name: string }>
  message: string
}

export class WhatsAppService {
  private readonly baseUrl = config.WHATSAPP_API_URL
  private readonly phoneNumberId = config.WHATSAPP_PHONE_NUMBER_ID
  private readonly accessToken = config.WHATSAPP_ACCESS_TOKEN

  /**
   * Send a single WhatsApp text message
   */
  async sendTextMessage(to: string, message: string): Promise<{ messageId: string }> {
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/\D/g, ''), // Remove non-numeric characters
      type: 'text',
      text: {
        preview_url: false,
        body: message,
      },
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      return {
        messageId: response.data.messages[0].id,
      }
    } catch (error: any) {
      console.error('WhatsApp API Error:', error.response?.data || error.message)
      throw new Error(`Failed to send WhatsApp message: ${error.response?.data?.error?.message || error.message}`)
    }
  }

  /**
   * Send bulk messages with rate limiting (50 messages per second)
   */
  async sendBulkMessages(bulkMessage: BulkMessage): Promise<{
    total: number
    sent: number
    failed: number
    results: Array<{ phone: string; success: boolean; messageId?: string; error?: string }>
  }> {
    const RATE_LIMIT = 50 // messages per second
    const RATE_INTERVAL_MS = 1000

    const results: Array<{ phone: string; success: boolean; messageId?: string; error?: string }> = []
    let sent = 0
    let failed = 0

    for (let i = 0; i < bulkMessage.recipients.length; i++) {
      const recipient = bulkMessage.recipients[i]

      try {
        const result = await this.sendTextMessage(recipient.phone, bulkMessage.message)
        results.push({
          phone: recipient.phone,
          success: true,
          messageId: result.messageId,
        })
        sent++
      } catch (error: any) {
        results.push({
          phone: recipient.phone,
          success: false,
          error: error.message,
        })
        failed++
      }

      // Rate limiting: wait every RATE_LIMIT messages
      if (i > 0 && i % RATE_LIMIT === 0 && i < bulkMessage.recipients.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, RATE_INTERVAL_MS))
      }
    }

    return {
      total: bulkMessage.recipients.length,
      sent,
      failed,
      results,
    }
  }

  /**
   * Send a template message (requires pre-approved templates)
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    components: any[]
  ): Promise<{ messageId: string }> {
    const payload = {
      messaging_product: 'whatsapp',
      to: to.replace(/\D/g, ''),
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'pt_BR' },
        components,
      },
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      return {
        messageId: response.data.messages[0].id,
      }
    } catch (error: any) {
      console.error('WhatsApp API Error:', error.response?.data || error.message)
      throw new Error(`Failed to send template message: ${error.response?.data?.error?.message || error.message}`)
    }
  }
}

// Singleton instance
export const whatsappService = new WhatsAppService()
