import { PrismaClient } from '@prisma/client'
import { config } from '../../config/env'

// Ajusta DATABASE_URL para compatibilidade com pgBouncer/Supabase
// Previne o erro "prepared statement does not exist"
const getDatabaseUrl = () => {
  const baseUrl = process.env.DATABASE_URL || ''

  // Se for Supabase, adiciona parâmetros para pgBouncer
  if (baseUrl.includes('supabase.co')) {
    const url = new URL(baseUrl)
    url.searchParams.set('pgbouncer', 'true')
    url.searchParams.set('connection_limit', '1')
    return url.toString()
  }

  return baseUrl
}

// Singleton Prisma Client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.isDev ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  })

if (config.isDev) globalForPrisma.prisma = prisma

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

// Health check para manter a conexão ativa (previne timeout em produção)
if (!config.isDev) {
  setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch (error) {
      console.error('❌ Prisma health check failed:', error)
    }
  }, 60000) // 1 minuto
}
