import bcrypt from "bcryptjs";

import { createPrismaClient } from "../src/shared/db/prisma";

const prisma = createPrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Clean existing data (optional - comment if you want to keep data)
  console.log("🧹 Cleaning existing data...");
  await prisma.notification.deleteMany();
  await prisma.complaintMessage.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.complaintAssignment.deleteMany();
  await prisma.sectorMember.deleteMany();
  await prisma.message.deleteMany();
  await prisma.complaintStatusHistory.deleteMany();
  await prisma.complaintAttachment.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.cannedResponse.deleteMany();
  await prisma.sector.deleteMany();
  await prisma.residentDocument.deleteMany();
  await prisma.resident.deleteMany();
  await prisma.userCondominium.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.slaConfig.deleteMany();
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
      autoTriageEnabled: true,
      autoAssignEnabled: true,
      autoCloseAfterDays: 7,
      waitingAutoResolveDays: 14,
    },
  });

  const condo2 = await prisma.condominium.create({
    data: {
      name: "Residencial Bela Vista",
      cnpj: "98765432000199",
      status: "ACTIVE",
      whatsappPhone: "5511999990001",
      autoTriageEnabled: true,
      autoAssignEnabled: false,
      autoCloseAfterDays: 7,
      waitingAutoResolveDays: 14,
    },
  });

  console.log("✅ Condominiums created");

  // =====================================================
  // Create default sectors (service queues)
  // =====================================================

  const sectorManutencao = await prisma.sector.create({
    data: {
      condominiumId: condo1.id,
      name: "Manutenção",
      categories: ["Manutenção"],
    },
  });

  const sectorLimpeza = await prisma.sector.create({
    data: {
      condominiumId: condo1.id,
      name: "Limpeza",
      categories: ["Limpeza"],
    },
  });

  const sectorSeguranca = await prisma.sector.create({
    data: {
      condominiumId: condo1.id,
      name: "Segurança",
      categories: ["Segurança"],
    },
  });

  const sectorSindico = await prisma.sector.create({
    data: {
      condominiumId: condo1.id,
      name: "Síndico",
      categories: [],
    },
  });

  const sectorAdministrativo = await prisma.sector.create({
    data: {
      condominiumId: condo1.id,
      name: "Administrativo",
      categories: ["Barulho", "Estacionamento", "Área Comum", "Outros"],
    },
  });

  const sectorConselho = await prisma.sector.create({
    data: {
      condominiumId: condo1.id,
      name: "Conselho",
      categories: [],
    },
  });

  console.log("✅ Sectors (service queues) created");

  // Novidades da semana (announcements) para o morador
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  await prisma.announcement.createMany({
    data: [
      {
        condominiumId: condo1.id,
        title: "Novidade da semana",
        content: "Reunião de condomínio na próxima quarta-feira às 19h. Participe!",
        startsAt: weekStart,
        endsAt: weekEnd,
        createdBy: null,
        scope: "ALL",
        sendWhatsApp: false,
        expiresAt: null,
      },
      {
        condominiumId: condo1.id,
        title: "Manutenção do elevador",
        content: "O elevador da torre A passará por manutenção preventiva na sexta-feira. Use as escadas no período das 9h às 12h.",
        startsAt: weekStart,
        endsAt: weekEnd,
        createdBy: null,
        scope: "ALL",
        sendWhatsApp: true,
        expiresAt: null,
      },
    ],
  });
  console.log("✅ Announcements (novidades) created");

  // Create users with different approval statuses
  const hashedPassword = await bcrypt.hash("Admin123!@#", 10);

  // =====================================================
  // APPROVED USERS (Managers - auto-approved)
  // =====================================================

  const superAdmin = await prisma.user.create({
    data: {
      email: "superadmin@email.com",
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
      email: "yrlan.01@email.com",
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
      email: "admin@email.com",
      password: hashedPassword,
      name: "Admin TalkZap",
      role: "ADMIN",
      permissionScope: "LOCAL",
      status: "APPROVED",
      approvedAt: new Date(),
    },
  });

  const syndic = await prisma.user.create({
    data: {
      email: "sindico@email.com",
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
      email: "professional@email.com",
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

  const complaint1 = await prisma.complaint.create({
    data: {
      condominiumId: condo1.id,
      residentId: resident1.id,
      category: "Barulho",
      content: "Som alto após 22h no apartamento 201",
      status: "NEW",
      priority: "HIGH",
      isAnonymous: false,
    },
  });

  const complaint2 = await prisma.complaint.create({
    data: {
      condominiumId: condo1.id,
      residentId: resident2.id,
      category: "Limpeza",
      content: "Lixo acumulado no corredor do 1º andar",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      isAnonymous: false,
    },
  });

  await prisma.complaint.create({
    data: {
      condominiumId: condo1.id,
      residentId: resident3.id,
      category: "Segurança",
      content: "Câmera do elevador não está funcionando",
      status: "NEW",
      priority: "CRITICAL",
      isAnonymous: true,
    },
  });

  const complaint4 = await prisma.complaint.create({
    data: {
      condominiumId: condo1.id,
      residentId: resident4.id,
      category: "Manutenção",
      content: "Vazamento no banheiro",
      status: "RESOLVED",
      priority: "HIGH",
      isAnonymous: false,
      resolvedAt: new Date(),
      resolvedBy: syndic.id,
      csatScore: 5,
      csatComment: "Excelente atendimento, muito rápido!",
      csatRespondedAt: new Date(),
    },
  });

  const complaint5 = await prisma.complaint.create({
    data: {
      condominiumId: condo1.id,
      residentId: resident5.id,
      category: "Estacionamento",
      content: "Veículo estacionado em vaga irregular",
      status: "RESOLVED",
      priority: "LOW",
      isAnonymous: false,
      resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      resolvedBy: syndic.id,
      csatScore: 4,
      csatComment: "Atendimento bom, mas demorou um pouco.",
      csatRespondedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  const complaint6 = await prisma.complaint.create({
    data: {
      condominiumId: condo1.id,
      residentId: resident1.id,
      category: "Área Comum",
      content: "Piscina precisa de manutenção urgente",
      status: "RESOLVED",
      priority: "HIGH",
      isAnonymous: false,
      resolvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      resolvedBy: admin.id,
      csatScore: 3,
      csatComment: "Resolvido, mas poderia ter sido mais ágil.",
      csatRespondedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("✅ Complaints created");

  // =====================================================
  // Create complaint messages (chat)
  // =====================================================

  await prisma.complaintMessage.createMany({
    data: [
      {
        complaintId: complaint2.id,
        senderId: residentUser2.id,
        senderRole: "RESIDENT",
        content: "Bom dia, gostaria de saber se já tem previsão para o reparo?",
        source: "WEB",
      },
      {
        complaintId: complaint2.id,
        senderId: syndic.id,
        senderRole: "SYNDIC",
        content: "Bom dia! Já acionamos a equipe de manutenção. Previsão para amanhã às 14h.",
        source: "WEB",
      },
      {
        complaintId: complaint2.id,
        senderId: residentUser2.id,
        senderRole: "RESIDENT",
        content: "Perfeito, obrigado pela rapidez!",
        source: "WEB",
      },
    ],
  });

  console.log("✅ Complaint messages created");

  // =====================================================
  // Create notifications
  // =====================================================

  await prisma.notification.createMany({
    data: [
      {
        userId: syndic.id,
        type: "complaint_status",
        title: "Nova ocorrência registrada",
        body: `Ocorrência #${complaint1.id} (Barulho) foi registrada pelo morador Carlos.`,
        read: false,
      },
      {
        userId: syndic.id,
        type: "sla_warning",
        title: "SLA em risco",
        body: `Ocorrência #${complaint2.id} - 30 minutos para o prazo de resposta.`,
        read: true,
      },
      {
        userId: residentUser2.id,
        type: "complaint_status",
        title: "Status atualizado",
        body: `Sua ocorrência #${complaint2.id} está Em Andamento.`,
        read: false,
      },
      {
        userId: residentUser4.id,
        type: "complaint_status",
        title: "Ocorrência resolvida",
        body: `Sua ocorrência #${complaint4.id} foi resolvida. Avalie o atendimento!`,
        read: true,
      },
    ],
  });

  console.log("✅ Notifications created");

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
  // Create global canned responses (condominiumId: null)
  // =====================================================

  const globalTemplates = [
    { title: "Manutenção agendada", content: "Informamos que a manutenção foi agendada. Entraremos em contato com a data e horário." },
    { title: "Aguardando orçamento", content: "Estamos aguardando o orçamento do fornecedor. Assim que recebermos, daremos retorno." },
    { title: "Problema resolvido", content: "O problema relatado foi resolvido. Caso persista, por favor abra uma nova ocorrência." },
    { title: "Encaminhado ao setor", content: "Sua ocorrência foi encaminhada ao setor responsável para análise e providências." },
    { title: "Informações insuficientes", content: "Precisamos de mais detalhes para dar andamento. Por favor, complemente sua ocorrência com fotos ou descrição mais detalhada." },
    { title: "Visita técnica agendada", content: "Uma visita técnica foi agendada para avaliar a situação. Entraremos em contato para confirmar data e horário." },
    { title: "Em análise pelo fornecedor", content: "Sua ocorrência está em análise pelo fornecedor responsável. Retornaremos assim que tivermos um posicionamento." },
  ];

  await prisma.cannedResponse.createMany({
    data: globalTemplates.map((t) => ({
      title: t.title,
      content: t.content,
      condominiumId: null,
      sectorId: null,
      createdBy: superAdmin.id,
    })),
  });

  console.log("✅ Global canned responses created");

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
  console.log("   - superadmin@email.com (Super Admin)");
  console.log("   - yrlan.01@email.com (Super Admin)");
  console.log("   - admin@email.com (Admin)");
  console.log("   - sindico@email.com (Síndico)");
  console.log("   - professional@email.com (Síndico Profissional)");
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
  console.log("📋 Ocorrências: 6 (3 resolvidas com CSAT)");
  console.log("🏷️  Setores: 6 (Manutenção, Limpeza, Segurança, Síndico, Administrativo, Conselho)");
  console.log("💬 Mensagens: 5");
  console.log("💬 Mensagens de ocorrência: 3 (chat em #2)");
  console.log("🔔 Notificações: 4");
  console.log("📝 Respostas pré-cadastradas globais: 7");

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
