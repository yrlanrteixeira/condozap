import { config as dotenvConfig } from "dotenv";
import { z } from "zod";

dotenvConfig();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.string().default("info"),

  // Database
  DATABASE_URL: z.string(),

  // Supabase (optional - only needed if STORAGE_TYPE=supabase)
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("7d"),

  // CORS - Pode ser uma string única ou múltiplas separadas por vírgula
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  // WhatsApp API (Official - Meta)
  WHATSAPP_API_URL: z.string().default("https://graph.facebook.com/v21.0"),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional(),

  // Evolution API (Unofficial - Baileys)
  EVOLUTION_API_URL: z.string().default("http://localhost:8080"),
  EVOLUTION_API_KEY: z.string().optional(),
  EVOLUTION_INSTANCE_NAME: z.string().default("talkzap"),
  WHATSAPP_PROVIDER: z.enum(["evolution", "official"]).default("evolution"),

  // File Storage (Optional - can use local storage or S3)
  STORAGE_TYPE: z.enum(["local", "s3", "supabase"]).default("local"),
  STORAGE_PATH: z.string().default("./uploads"),

  // S3 (if using S3 or S3-compatible like Railway)
  AWS_S3_ENDPOINT: z.string().url().optional(),
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const config = {
  ...parsed.data,
  isDev: parsed.data.NODE_ENV === "development",
  isProd: parsed.data.NODE_ENV === "production",
  isTest: parsed.data.NODE_ENV === "test",
  // Parse CORS_ORIGIN como array se tiver vírgulas
  CORS_ORIGIN: parsed.data.CORS_ORIGIN.includes(",")
    ? parsed.data.CORS_ORIGIN.split(",").map((origin) => origin.trim())
    : parsed.data.CORS_ORIGIN,
};
