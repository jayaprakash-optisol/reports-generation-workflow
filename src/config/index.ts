import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // Server
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // OpenAI
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_IMAGE_MODEL: z.string().default('dall-e-3'),

  // Temporal
  TEMPORAL_ADDRESS: z.string().default('localhost:7233'),
  TEMPORAL_NAMESPACE: z.string().default('default'),
  TEMPORAL_TASK_QUEUE: z.string().default('report-generation'),

  // Storage
  STORAGE_TYPE: z.enum(['local', 'minio']).default('local'),
  STORAGE_PATH: z.string().default('./storage'),
  REPORTS_PATH: z.string().default('./storage/reports'),
  UPLOADS_PATH: z.string().default('./storage/uploads'),
  CHARTS_PATH: z.string().default('./storage/charts'),

  // MinIO Configuration
  MINIO_ENDPOINT: z.string().default('http://localhost:9000'),
  MINIO_ACCESS_KEY: z.string().default('minioadmin'),
  MINIO_SECRET_KEY: z.string().default('minioadmin'),
  MINIO_BUCKET_REPORTS: z.string().default('reports'),
  MINIO_BUCKET_UPLOADS: z.string().default('uploads'),
  MINIO_BUCKET_CHARTS: z.string().default('charts'),
  MINIO_USE_SSL: z.string().default('false'),

  // Report
  MAX_UPLOAD_SIZE_MB: z.string().default('20'),
  DEFAULT_REPORT_STYLE: z.enum(['business', 'research', 'technical']).default('business'),
  DEFAULT_OUTPUT_FORMAT: z.enum(['PDF', 'DOCX', 'HTML']).default('PDF'),

  // LLM
  LLM_MAX_TOKENS: z.string().default('4096'),
  LLM_TEMPERATURE: z.string().default('0.7'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

const env = parsed.data;

export const config = {
  server: {
    port: parseInt(env.PORT, 10),
    nodeEnv: env.NODE_ENV,
    isDev: env.NODE_ENV === 'development',
    isProd: env.NODE_ENV === 'production',
  },
  openai: {
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    imageModel: env.OPENAI_IMAGE_MODEL,
  },
  temporal: {
    address: env.TEMPORAL_ADDRESS,
    namespace: env.TEMPORAL_NAMESPACE,
    taskQueue: env.TEMPORAL_TASK_QUEUE,
  },
  storage: {
    type: env.STORAGE_TYPE,
    basePath: env.STORAGE_PATH,
    reportsPath: env.REPORTS_PATH,
    uploadsPath: env.UPLOADS_PATH,
    chartsPath: env.CHARTS_PATH,
  },
  minio: {
    endpoint: env.MINIO_ENDPOINT,
    accessKey: env.MINIO_ACCESS_KEY,
    secretKey: env.MINIO_SECRET_KEY,
    buckets: {
      reports: env.MINIO_BUCKET_REPORTS,
      uploads: env.MINIO_BUCKET_UPLOADS,
      charts: env.MINIO_BUCKET_CHARTS,
    },
    useSSL: env.MINIO_USE_SSL === 'true',
  },
  report: {
    maxUploadSizeMB: Number.parseInt(env.MAX_UPLOAD_SIZE_MB, 10),
    defaultStyle: env.DEFAULT_REPORT_STYLE,
    defaultFormat: env.DEFAULT_OUTPUT_FORMAT,
  },
  llm: {
    maxTokens: Number.parseInt(env.LLM_MAX_TOKENS, 10),
    temperature: Number.parseFloat(env.LLM_TEMPERATURE),
  },
  logging: {
    level: env.LOG_LEVEL,
  },
} as const;

export type Config = typeof config;
