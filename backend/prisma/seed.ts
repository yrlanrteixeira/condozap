import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create condominiums
  const condo1 = await prisma.condominium.create({
    data: {
      name: 'Condomínio Vista Verde',
      cnpj: '12345678000190',
      status: 'ACTIVE',
      whatsappPhone: '5511999990000',
    },
  })

  const condo2 = await prisma.condominium.create({
    data: {
      name: 'Residencial Bela Vista',
      cnpj: '98765432000199',
      status: 'ACTIVE',
      whatsappPhone: '5511999990001',
    },
  })

  console.log('✅ Condominiums created')

  // Create users
  const hashedPassword = await bcrypt.hash('Admin123!@#', 10)

  const admin = await prisma.user.create({
    data: {
      email: 'admin@condozap.com',
      password: hashedPassword,
      name: 'Admin CondoZap',
      role: 'ADMIN',
      permissionScope: 'LOCAL',
    },
  })

  const syndic = await prisma.user.create({
    data: {
      email: 'sindico@vistaverde.com',
      password: hashedPassword,
      name: 'João Silva',
      role: 'SYNDIC',
      permissionScope: 'LOCAL',
    },
  })

  const professionalSyndic = await prisma.user.create({
    data: {
      email: 'professional@sindicos.com',
      password: hashedPassword,
      name: 'Maria Santos',
      role: 'PROFESSIONAL_SYNDIC',
      permissionScope: 'GLOBAL',
    },
  })

  console.log('✅ Users created')

  // Link users to condominiums
  await prisma.userCondominium.createMany({
    data: [
      { userId: admin.id, condominiumId: condo1.id, role: 'ADMIN' },
      { userId: syndic.id, condominiumId: condo1.id, role: 'SYNDIC' },
      { userId: professionalSyndic.id, condominiumId: condo1.id, role: 'PROFESSIONAL_SYNDIC' },
      { userId: professionalSyndic.id, condominiumId: condo2.id, role: 'PROFESSIONAL_SYNDIC' },
    ],
  })

  console.log('✅ User-Condominium relationships created')

  // Create residents for Condo 1
  const residents = await prisma.resident.createMany({
    data: [
      // Torre A
      {
        condominiumId: condo1.id,
        name: 'Carlos Oliveira',
        phone: '5511999990001',
        tower: 'A',
        floor: '1',
        unit: '101',
        type: 'OWNER',
        consentWhatsapp: true,
        consentDataProcessing: true,
      },
      {
        condominiumId: condo1.id,
        name: 'Ana Costa',
        phone: '5511999990002',
        tower: 'A',
        floor: '1',
        unit: '102',
        type: 'OWNER',
        consentWhatsapp: true,
        consentDataProcessing: true,
      },
      {
        condominiumId: condo1.id,
        name: 'Pedro Santos',
        phone: '5511999990003',
        tower: 'A',
        floor: '2',
        unit: '201',
        type: 'TENANT',
        consentWhatsapp: true,
        consentDataProcessing: true,
      },
      // Torre B
      {
        condominiumId: condo1.id,
        name: 'Juliana Lima',
        phone: '5511999990004',
        tower: 'B',
        floor: '1',
        unit: '101',
        type: 'OWNER',
        consentWhatsapp: true,
        consentDataProcessing: true,
      },
      {
        condominiumId: condo1.id,
        name: 'Roberto Alves',
        phone: '5511999990005',
        tower: 'B',
        floor: '2',
        unit: '201',
        type: 'OWNER',
        consentWhatsapp: false,
        consentDataProcessing: true,
      },
    ],
  })

  console.log('✅ Residents created')

  // Get resident IDs
  const residentsList = await prisma.resident.findMany({
    where: { condominiumId: condo1.id },
  })

  // Create complaints
  await prisma.complaint.createMany({
    data: [
      {
        condominiumId: condo1.id,
        residentId: residentsList[0].id,
        category: 'Barulho',
        content: 'Som alto após 22h no apartamento 201',
        status: 'OPEN',
        priority: 'HIGH',
        isAnonymous: false,
      },
      {
        condominiumId: condo1.id,
        residentId: residentsList[1].id,
        category: 'Limpeza',
        content: 'Lixo acumulado no corredor do 1º andar',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        isAnonymous: false,
      },
      {
        condominiumId: condo1.id,
        residentId: residentsList[2].id,
        category: 'Segurança',
        content: 'Câmera do elevador não está funcionando',
        status: 'OPEN',
        priority: 'CRITICAL',
        isAnonymous: true,
      },
      {
        condominiumId: condo1.id,
        residentId: residentsList[3].id,
        category: 'Manutenção',
        content: 'Vazamento no banheiro',
        status: 'RESOLVED',
        priority: 'HIGH',
        isAnonymous: false,
      },
    ],
  })

  console.log('✅ Complaints created')

  // Create messages
  await prisma.message.createMany({
    data: [
      {
        condominiumId: condo1.id,
        type: 'TEXT',
        scope: 'ALL',
        content: 'Aviso: Manutenção programada no elevador amanhã das 9h às 12h',
        recipientCount: 5,
        whatsappStatus: 'DELIVERED',
        sentBy: admin.id,
      },
      {
        condominiumId: condo1.id,
        type: 'TEXT',
        scope: 'TOWER',
        targetTower: 'A',
        content: 'Limpeza da caixa d\'água da Torre A na próxima semana',
        recipientCount: 3,
        whatsappStatus: 'SENT',
        sentBy: syndic.id,
      },
    ],
  })

  console.log('✅ Messages created')

  console.log('\n🎉 Seed completed successfully!')
  console.log('\n📧 Login credentials:')
  console.log('   Admin: admin@condozap.com / Admin123!@#')
  console.log('   Síndico: sindico@vistaverde.com / Admin123!@#')
  console.log('   Síndico Profissional: professional@sindicos.com / Admin123!@#')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
