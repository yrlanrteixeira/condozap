import { PrismaClient, WhatsAppStatus } from "@prisma/client";

export async function updateMessageStatus(
  prisma: PrismaClient,
  whatsappMessageId: string,
  status: WhatsAppStatus
) {
  return prisma.message.updateMany({
    where: { whatsappMessageId },
    data: { whatsappStatus: status },
  });
}
