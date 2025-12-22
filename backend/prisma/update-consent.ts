/**
 * Script para atualizar o consentimento dos moradores existentes
 * 
 * Este script atualiza todos os moradores que têm consentWhatsapp ou 
 * consentDataProcessing como false para true, permitindo que recebam mensagens.
 * 
 * Execute com: npm run db:update-consent
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { PrismaClient } from '@prisma/client';

// Obter __dirname em ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente do arquivo .env
config({ path: resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Atualizando consentimento dos moradores...\n');

  try {
    // Buscar moradores sem consentimento
    const residentsWithoutConsent = await prisma.resident.findMany({
      where: {
        OR: [
          { consentWhatsapp: false },
          { consentDataProcessing: false }
        ]
      },
      select: {
        id: true,
        name: true,
        consentWhatsapp: true,
        consentDataProcessing: true,
      }
    });

    console.log(`📊 Encontrados ${residentsWithoutConsent.length} moradores sem consentimento completo:\n`);
    
    if (residentsWithoutConsent.length === 0) {
      console.log('✅ Todos os moradores já têm consentimento habilitado!');
      return;
    }

    // Mostrar lista
    residentsWithoutConsent.forEach((resident, index) => {
      console.log(`${index + 1}. ${resident.name}`);
      console.log(`   WhatsApp: ${resident.consentWhatsapp ? '✅' : '❌'} | Dados: ${resident.consentDataProcessing ? '✅' : '❌'}`);
    });

    console.log('\n🔧 Atualizando...\n');

    // Atualizar todos de uma vez
    const result = await prisma.resident.updateMany({
      where: {
        OR: [
          { consentWhatsapp: false },
          { consentDataProcessing: false }
        ]
      },
      data: {
        consentWhatsapp: true,
        consentDataProcessing: true,
      }
    });

    console.log(`✅ ${result.count} moradores atualizados com sucesso!`);
    console.log('   - consent_whatsapp: true');
    console.log('   - consent_data_processing: true\n');

    // Verificar resultado
    const updatedResidents = await prisma.resident.findMany({
      where: {
        id: {
          in: residentsWithoutConsent.map(r => r.id)
        }
      },
      select: {
        id: true,
        name: true,
        consentWhatsapp: true,
        consentDataProcessing: true,
      }
    });

    console.log('📋 Status após atualização:\n');
    updatedResidents.forEach((resident, index) => {
      console.log(`${index + 1}. ${resident.name}`);
      console.log(`   WhatsApp: ${resident.consentWhatsapp ? '✅' : '❌'} | Dados: ${resident.consentDataProcessing ? '✅' : '❌'}`);
    });

    console.log('\n✨ Pronto! Agora todos os moradores poderão receber mensagens.');

  } catch (error) {
    console.error('❌ Erro ao atualizar moradores:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

