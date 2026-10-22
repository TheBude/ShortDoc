import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL muhit o‘zgaruvchisi kiritilishi shart'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET muhit o‘zgaruvchisi kiritilishi shart (zaxira qiymat qabul qilinmaydi)'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  APP_URL: z.string().default('http://localhost:3000'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(25),
  SEED_ALLOW: z.string().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
  SEED_REKTOR_PASSWORD: z.string().optional(),
  SEED_DEVON_PASSWORD: z.string().optional(),
  SEED_DEKAN_PASSWORD: z.string().optional(),
  SEED_XODIM_PASSWORD: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  console.error('❌ [ShortDoc XATOLIK] Render Muhit O‘zgaruvchilarida (Environment Variables) xatolik:');
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n');
  process.exit(1);
}

const env = parsedEnv.data;

if (env.NODE_ENV === 'production' && env.JWT_SECRET.length < 32) {
  console.error('\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  console.error('❌ [Xavfsizlik Xatosi] JWT_SECRET kamida 32 ta belgidan iborat bo‘lishi shart!');
  console.error(`Joriy uzunlik: ${env.JWT_SECRET.length} ta belgi.`);
  console.error('Render Environment bo‘limida JWT_SECRET qiymatini kamida 32 belgili qilib o‘rnating!');
  console.error('Masalan: 64 belgili kuchli kalit: openssl rand -hex 32');
  console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n');
  process.exit(1);
}

export const config = {
  ...env,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
} as const;

export type Config = typeof config;
export default config;
