import axios from 'axios';
import { FastifyBaseLogger } from 'fastify';

/**
 * Interface para os parâmetros de envio de e-mail.
 */
export interface SendEmailOptions {
  to: { name?: string; email: string }[];
  subject: string;
  htmlContent: string;
  sender?: { name: string; email: string };
}

/**
 * Utilitário genérico para enviar e-mails via API REST da Brevo (Sendinblue).
 * Certifique-se de que a variável de ambiente BREVO_API_KEY esteja configurada.
 */
export async function sendEmail(
  options: SendEmailOptions,
  logger?: FastifyBaseLogger
): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    if (logger) {
      logger.warn('BREVO_API_KEY não configurada. O e-mail não será enviado. Detalhes: ' + JSON.stringify(options.to));
    } else {
      console.warn('BREVO_API_KEY não configurada. E-mail skipado.');
    }
    return;
  }

  const defaultSender = {
    name: process.env.BREVO_SENDER_NAME || 'CondoZap',
    email: process.env.BREVO_SENDER_EMAIL || 'no-reply@condozap.com',
  };

  const payload = {
    sender: options.sender || defaultSender,
    to: options.to.map((t) => ({ email: t.email, name: t.name || t.email })),
    subject: options.subject,
    htmlContent: options.htmlContent,
  };

  try {
    const response = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (logger) {
      logger.info(`E-mail enviado com sucesso via Brevo. MessageId: ${response.data.messageId}`);
    }
  } catch (error: any) {
    if (logger) {
      logger.error(`Erro ao enviar e-mail via Brevo: ${error.response?.data?.message || error.message}`);
    } else {
      console.error('Erro ao enviar e-mail via Brevo:', error.response?.data || error.message);
    }
    // Não disparamos throw error para não travar o fluxo principal (cadastros, etc).
  }
}
