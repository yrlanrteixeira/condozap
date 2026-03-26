/**
 * Clear Database Script
 * 
 * Limpa todos os dados do banco de dados.
 * 
 * Uso: npx tsx prisma/clear.ts
 */

import { createPrismaClient } from "../src/shared/db/prisma";

const prisma = createPrismaClient();

async function clearDatabase() {
  console.log("🗑️  Iniciando limpeza do banco de dados...\n");

  try {
    // Ordem de deleção respeitando foreign keys
    // (do mais dependente para o menos dependente)

    console.log("   Deletando mensagens...");
    const messages = await prisma.message.deleteMany();
    console.log(`   ✅ ${messages.count} mensagens deletadas`);

    console.log("   Deletando histórico de status de ocorrências...");
    const statusHistory = await prisma.complaintStatusHistory.deleteMany();
    console.log(`   ✅ ${statusHistory.count} registros de histórico deletados`);

    console.log("   Deletando anexos de ocorrências...");
    const attachments = await prisma.complaintAttachment.deleteMany();
    console.log(`   ✅ ${attachments.count} anexos deletados`);

    console.log("   Deletando ocorrências...");
    const complaints = await prisma.complaint.deleteMany();
    console.log(`   ✅ ${complaints.count} ocorrências deletadas`);

    console.log("   Deletando moradores...");
    const residents = await prisma.resident.deleteMany();
    console.log(`   ✅ ${residents.count} moradores deletados`);

    console.log("   Deletando vínculos usuário-condomínio...");
    const userCondos = await prisma.userCondominium.deleteMany();
    console.log(`   ✅ ${userCondos.count} vínculos deletados`);

    console.log("   Deletando usuários...");
    const users = await prisma.user.deleteMany();
    console.log(`   ✅ ${users.count} usuários deletados`);

    console.log("   Deletando condomínios...");
    const condos = await prisma.condominium.deleteMany();
    console.log(`   ✅ ${condos.count} condomínios deletados`);

    console.log("\n✅ Banco de dados limpo com sucesso!\n");
    console.log("📋 Resumo:");
    console.log(`   - Mensagens: ${messages.count}`);
    console.log(`   - Histórico de Status: ${statusHistory.count}`);
    console.log(`   - Anexos: ${attachments.count}`);
    console.log(`   - Ocorrências: ${complaints.count}`);
    console.log(`   - Moradores: ${residents.count}`);
    console.log(`   - Vínculos User-Condo: ${userCondos.count}`);
    console.log(`   - Usuários: ${users.count}`);
    console.log(`   - Condomínios: ${condos.count}`);
    console.log("\n💡 Execute 'npx prisma db seed' para popular novamente.\n");

  } catch (error) {
    console.error("❌ Erro ao limpar banco de dados:", error);
    throw error;
  }
}

clearDatabase()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

