import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Clean existing data (optional - comment if you want to keep data)
  console.log("🧹 Cleaning existing data...");
  await prisma.message.deleteMany();
  await prisma.complaintStatusHistory.deleteMany();
  await prisma.complaintAttachment.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.resident.deleteMany();
  await prisma.userCondominium.deleteMany();
  await prisma.user.deleteMany();
  await prisma.condominium.deleteMany();
  console.log("✅ Data cleaned");

  // Create condominiums
  const condo1 = await prisma.condominium.create({
    data: {
      name: "Condomínio Vista Verde",
      cnpj: "12345678000190",
      status: "ACTIVE",
      whatsappPhone: "5511999990000",
    },
  });

  const condo2 = await prisma.condominium.create({
    data: {
      name: "Residencial Bela Vista",
      cnpj: "98765432000199",
      status: "ACTIVE",
      whatsappPhone: "5511999990001",
    },
  });

  console.log("✅ Condominiums created");

  // Create users with different approval statuses
  const hashedPassword = await bcrypt.hash("Admin123!@#", 10);

  // =====================================================
  // APPROVED USERS (Managers - auto-approved)
  // =====================================================

  const superAdmin = await prisma.user.create({
    data: {
      email: "superadmin@condozap.com",
      password: hashedPassword,
      name: "Super Admin",
      role: "SUPER_ADMIN",
      permissionScope: "GLOBAL",
      status: "APPROVED",
      approvedAt: new Date(),
    },
  });

  // Yolan's SUPER_ADMIN account
  const yrlanAdmin = await prisma.user.create({
    data: {
      email: "yrlan.01@hotmail.com",
      password: hashedPassword,
      name: "Yolan - Super Admin",
      role: "SUPER_ADMIN",
      permissionScope: "GLOBAL",
      status: "APPROVED",
      approvedAt: new Date(),
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: "admin@condozap.com",
      password: hashedPassword,
      name: "Admin CondoZap",
      role: "ADMIN",
      permissionScope: "LOCAL",
      status: "APPROVED",
      approvedAt: new Date(),
    },
  });

  const syndic = await prisma.user.create({
    data: {
      email: "sindico@vistaverde.com",
      password: hashedPassword,
      name: "João Silva",
      role: "SYNDIC",
      permissionScope: "LOCAL",
      status: "APPROVED",
      approvedAt: new Date(),
    },
  });

  const professionalSyndic = await prisma.user.create({
    data: {
      email: "professional@sindicos.com",
      password: hashedPassword,
      name: "Maria Santos",
      role: "PROFESSIONAL_SYNDIC",
      permissionScope: "GLOBAL",
      status: "APPROVED",
      approvedAt: new Date(),
    },
  });

  console.log("✅ Manager users created (APPROVED)");

  // =====================================================
  // APPROVED RESIDENTS (Already approved and linked)
  // =====================================================

  const residentUser1 = await prisma.user.create({
    data: {
      email: "carlos@email.com",
      password: hashedPassword,
      name: "Carlos Oliveira",
      role: "RESIDENT",
      permissionScope: "LOCAL",
      status: "APPROVED",
      approvedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      approvedBy: admin.id,
    },
  });

  const residentUser2 = await prisma.user.create({
    data: {
      email: "ana@email.com",
      password: hashedPassword,
      name: "Ana Costa",
      role: "RESIDENT",
      permissionScope: "LOCAL",
      status: "APPROVED",
      approvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      approvedBy: syndic.id,
    },
  });

  const residentUser3 = await prisma.user.create({
    data: {
      email: "pedro@email.com",
      password: hashedPassword,
      name: "Pedro Santos",
      role: "RESIDENT",
      permissionScope: "LOCAL",
      status: "APPROVED",
      approvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      approvedBy: syndic.id,
    },
  });

  const residentUser4 = await prisma.user.create({
    data: {
      email: "juliana@email.com",
      password: hashedPassword,
      name: "Juliana Lima",
      role: "RESIDENT",
      permissionScope: "LOCAL",
      status: "APPROVED",
      approvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      approvedBy: admin.id,
    },
  });

  const residentUser5 = await prisma.user.create({
    data: {
      email: "roberto@email.com",
      password: hashedPassword,
      name: "Roberto Alves",
      role: "RESIDENT",
      permissionScope: "LOCAL",
      status: "APPROVED",
      approvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      approvedBy: syndic.id,
    },
  });

  console.log("✅ Resident users created (APPROVED)");

  // =====================================================
  // PENDING USERS (Waiting for approval)
  // =====================================================

  const pendingUser1 = await prisma.user.create({
    data: {
      email: "lucas.pending@email.com",
      password: hashedPassword,
      name: "Lucas Ferreira",
      role: "RESIDENT",
      permissionScope: "LOCAL",
      status: "PENDING",
      requestedCondominiumId: condo1.id,
      requestedTower: "A",
      requestedFloor: "3",
      requestedUnit: "301",
    },
  });

  const pendingUser2 = await prisma.user.create({
    data: {
      email: "mariana.pending@email.com",
      password: hashedPassword,
      name: "Mariana Souza",
      role: "RESIDENT",
      permissionScope: "LOCAL",
      status: "PENDING",
      requestedCondominiumId: condo1.id,
      requestedTower: "B",
      requestedFloor: "2",
      requestedUnit: "202",
    },
  });

  const pendingUser3 = await prisma.user.create({
    data: {
      email: "fernando.pending@email.com",
      password: hashedPassword,
      name: "Fernando Gomes",
      role: "RESIDENT",
      permissionScope: "LOCAL",
      status: "PENDING",
      requestedCondominiumId: condo1.id,
      requestedTower: "A",
      requestedFloor: "4",
      requestedUnit: "401",
    },
  });

  // Pending for Condo 2
  const pendingUser4 = await prisma.user.create({
    data: {
      email: "camila.pending@email.com",
      password: hashedPassword,
      name: "Camila Rodrigues",
      role: "RESIDENT",
      permissionScope: "LOCAL",
      status: "PENDING",
      requestedCondominiumId: condo2.id,
      requestedTower: "1",
      requestedFloor: "5",
      requestedUnit: "501",
    },
  });

  console.log("✅ Pending users created (4 pending approval)");

  // =====================================================
  // REJECTED USER (For testing)
  // =====================================================

  await prisma.user.create({
    data: {
      email: "rejeitado@email.com",
      password: hashedPassword,
      name: "Usuário Teste Rejeitado",
      role: "RESIDENT",
      permissionScope: "LOCAL",
      status: "REJECTED",
      requestedCondominiumId: condo1.id,
      requestedTower: "C",
      requestedFloor: "1",
      requestedUnit: "101",
      rejectionReason:
        "Não foi possível confirmar a residência no condomínio. Torre C não existe.",
      approvedBy: admin.id, // Who rejected
    },
  });

  console.log("✅ Rejected user created (for testing)");

  // =====================================================
  // Link users to condominiums
  // =====================================================

  await prisma.userCondominium.createMany({
    data: [
      // Managers
      { userId: superAdmin.id, condominiumId: condo1.id, role: "SUPER_ADMIN" },
      { userId: superAdmin.id, condominiumId: condo2.id, role: "SUPER_ADMIN" },
      { userId: admin.id, condominiumId: condo1.id, role: "ADMIN" },
      { userId: syndic.id, condominiumId: condo1.id, role: "SYNDIC" },
      {
        userId: professionalSyndic.id,
        condominiumId: condo1.id,
        role: "PROFESSIONAL_SYNDIC",
      },
      {
        userId: professionalSyndic.id,
        condominiumId: condo2.id,
        role: "PROFESSIONAL_SYNDIC",
      },
      // Approved residents
      { userId: residentUser1.id, condominiumId: condo1.id, role: "RESIDENT" },
      { userId: residentUser2.id, condominiumId: condo1.id, role: "RESIDENT" },
      { userId: residentUser3.id, condominiumId: condo1.id, role: "RESIDENT" },
      { userId: residentUser4.id, condominiumId: condo1.id, role: "RESIDENT" },
      { userId: residentUser5.id, condominiumId: condo1.id, role: "RESIDENT" },
    ],
  });

  console.log("✅ User-Condominium relationships created");

  // =====================================================
  // Create residents (linked to approved users)
  // =====================================================

  const resident1 = await prisma.resident.create({
    data: {
      condominiumId: condo1.id,
      userId: residentUser1.id,
      name: "Carlos Oliveira",
      phone: "5511999990001",
      tower: "A",
      floor: "1",
      unit: "101",
      type: "OWNER",
      consentWhatsapp: true,
      consentDataProcessing: true,
    },
  });

  const resident2 = await prisma.resident.create({
    data: {
      condominiumId: condo1.id,
      userId: residentUser2.id,
      name: "Ana Costa",
      phone: "5511999990002",
      tower: "A",
      floor: "1",
      unit: "102",
      type: "OWNER",
      consentWhatsapp: true,
      consentDataProcessing: true,
    },
  });

  const resident3 = await prisma.resident.create({
    data: {
      condominiumId: condo1.id,
      userId: residentUser3.id,
      name: "Pedro Santos",
      phone: "5511999990003",
      tower: "A",
      floor: "2",
      unit: "201",
      type: "TENANT",
      consentWhatsapp: true,
      consentDataProcessing: true,
    },
  });

  const resident4 = await prisma.resident.create({
    data: {
      condominiumId: condo1.id,
      userId: residentUser4.id,
      name: "Juliana Lima",
      phone: "5511999990004",
      tower: "B",
      floor: "1",
      unit: "101",
      type: "OWNER",
      consentWhatsapp: true,
      consentDataProcessing: true,
    },
  });

  const resident5 = await prisma.resident.create({
    data: {
      condominiumId: condo1.id,
      userId: residentUser5.id,
      name: "Roberto Alves",
      phone: "5511999990005",
      tower: "B",
      floor: "2",
      unit: "201",
      type: "OWNER",
      consentWhatsapp: false,
      consentDataProcessing: true,
    },
  });

  // Additional residents without user accounts (manual entries)
  await prisma.resident.createMany({
    data: [
      {
        condominiumId: condo1.id,
        name: "Fernanda Martins",
        phone: "5511999990006",
        tower: "A",
        floor: "3",
        unit: "302",
        type: "OWNER",
        consentWhatsapp: true,
        consentDataProcessing: true,
      },
      {
        condominiumId: condo1.id,
        name: "Ricardo Pereira",
        phone: "5511999990007",
        tower: "B",
        floor: "3",
        unit: "301",
        type: "TENANT",
        consentWhatsapp: true,
        consentDataProcessing: true,
      },
      {
        condominiumId: condo1.id,
        name: "Luciana Santos",
        phone: "5511999990008",
        tower: "B",
        floor: "3",
        unit: "302",
        type: "OWNER",
        consentWhatsapp: true,
        consentDataProcessing: true,
      },
    ],
  });

  // Residents for Condo 2
  await prisma.resident.createMany({
    data: [
      {
        condominiumId: condo2.id,
        name: "Marcos Silva",
        phone: "5511999991001",
        tower: "1",
        floor: "1",
        unit: "101",
        type: "OWNER",
        consentWhatsapp: true,
        consentDataProcessing: true,
      },
      {
        condominiumId: condo2.id,
        name: "Patricia Gomes",
        phone: "5511999991002",
        tower: "1",
        floor: "2",
        unit: "201",
        type: "OWNER",
        consentWhatsapp: true,
        consentDataProcessing: true,
      },
    ],
  });

  console.log("✅ Residents created");

  // =====================================================
  // Create complaints
  // =====================================================

  await prisma.complaint.createMany({
    data: [
      {
        condominiumId: condo1.id,
        residentId: resident1.id,
        category: "Barulho",
        content: "Som alto após 22h no apartamento 201",
        status: "NEW",
        priority: "HIGH",
        isAnonymous: false,
      },
      {
        condominiumId: condo1.id,
        residentId: resident2.id,
        category: "Limpeza",
        content: "Lixo acumulado no corredor do 1º andar",
        status: "IN_PROGRESS",
        priority: "MEDIUM",
        isAnonymous: false,
      },
      {
        condominiumId: condo1.id,
        residentId: resident3.id,
        category: "Segurança",
        content: "Câmera do elevador não está funcionando",
        status: "NEW",
        priority: "CRITICAL",
        isAnonymous: true,
      },
      {
        condominiumId: condo1.id,
        residentId: resident4.id,
        category: "Manutenção",
        content: "Vazamento no banheiro",
        status: "RESOLVED",
        priority: "HIGH",
        isAnonymous: false,
        resolvedAt: new Date(),
        resolvedBy: syndic.id,
      },
      {
        condominiumId: condo1.id,
        residentId: resident5.id,
        category: "Estacionamento",
        content: "Veículo estacionado em vaga irregular",
        status: "NEW",
        priority: "LOW",
        isAnonymous: false,
      },
      {
        condominiumId: condo1.id,
        residentId: resident1.id,
        category: "Área Comum",
        content: "Piscina precisa de manutenção urgente",
        status: "IN_PROGRESS",
        priority: "HIGH",
        isAnonymous: false,
      },
    ],
  });

  console.log("✅ Complaints created");

  // =====================================================
  // Create messages
  // =====================================================

  await prisma.message.createMany({
    data: [
      {
        condominiumId: condo1.id,
        type: "TEXT",
        scope: "ALL",
        content:
          "Aviso: Manutenção programada no elevador amanhã das 9h às 12h",
        recipientCount: 8,
        whatsappStatus: "DELIVERED",
        sentBy: admin.id,
      },
      {
        condominiumId: condo1.id,
        type: "TEXT",
        scope: "TOWER",
        targetTower: "A",
        content: "Limpeza da caixa d'água da Torre A na próxima semana",
        recipientCount: 4,
        whatsappStatus: "READ",
        sentBy: syndic.id,
      },
      {
        condominiumId: condo1.id,
        type: "TEXT",
        scope: "ALL",
        content:
          "Reunião de condomínio dia 15/12 às 19h no salão de festas. Pauta: Obras e orçamento 2024.",
        recipientCount: 8,
        whatsappStatus: "DELIVERED",
        sentBy: syndic.id,
      },
      {
        condominiumId: condo1.id,
        type: "TEXT",
        scope: "TOWER",
        targetTower: "B",
        content: "Pintura do corredor da Torre B iniciará na segunda-feira.",
        recipientCount: 4,
        whatsappStatus: "SENT",
        sentBy: admin.id,
      },
      {
        condominiumId: condo2.id,
        type: "TEXT",
        scope: "ALL",
        content:
          "Bem-vindos ao Residencial Bela Vista! Sistema de comunicação ativado.",
        recipientCount: 2,
        whatsappStatus: "DELIVERED",
        sentBy: professionalSyndic.id,
      },
    ],
  });

  console.log("✅ Messages created");

  // =====================================================
  // Summary
  // =====================================================

  console.log("\n🎉 Seed completed successfully!");
  console.log("\n" + "=".repeat(60));
  console.log("📊 RESUMO DOS DADOS CRIADOS:");
  console.log("=".repeat(60));
  console.log("\n🏢 Condomínios: 2");
  console.log("   - Condomínio Vista Verde");
  console.log("   - Residencial Bela Vista");

  console.log("\n👥 Usuários Aprovados (podem fazer login):");
  console.log("   - superadmin@condozap.com (Super Admin)");
  console.log("   - admin@condozap.com (Admin)");
  console.log("   - sindico@vistaverde.com (Síndico)");
  console.log("   - professional@sindicos.com (Síndico Profissional)");
  console.log("   - carlos@email.com (Morador)");
  console.log("   - ana@email.com (Morador)");
  console.log("   - pedro@email.com (Morador)");
  console.log("   - juliana@email.com (Morador)");
  console.log("   - roberto@email.com (Morador)");

  console.log("\n⏳ Usuários Pendentes (aguardando aprovação):");
  console.log("   - lucas.pending@email.com (Torre A - 301)");
  console.log("   - mariana.pending@email.com (Torre B - 202)");
  console.log("   - fernando.pending@email.com (Torre A - 401)");
  console.log("   - camila.pending@email.com (Condo 2 - Torre 1 - 501)");

  console.log("\n❌ Usuário Rejeitado (para teste):");
  console.log("   - rejeitado@email.com");

  console.log("\n🏠 Moradores: 10 (8 no Vista Verde, 2 no Bela Vista)");
  console.log("📋 Ocorrências: 6");
  console.log("💬 Mensagens: 5");

  console.log("\n" + "=".repeat(60));
  console.log("🔑 CREDENCIAIS PARA LOGIN:");
  console.log("=".repeat(60));
  console.log("   Senha padrão para todos: Admin123!@#");
  console.log("=".repeat(60) + "\n");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
