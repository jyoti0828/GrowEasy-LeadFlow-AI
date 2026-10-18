import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  AI_PROVIDER: z.enum(['gemini', 'openai', 'anthropic']).default('gemini'),
  GEMINI_API_KEY: z.string().min(1, 'Gemini API key is required'),
  AI_MODEL: z.string().min(1, 'AI_MODEL is required and must not be empty'),
  AI_BATCH_SIZE: z.coerce.number().default(25),
  AI_BATCH_CONCURRENCY: z.coerce.number().default(2),
  AI_MAX_RETRIES: z.coerce.number().default(2),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().default(60000),
  MAX_FILE_SIZE_MB: z.coerce.number().default(10),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
});

export type EnvConfig = z.infer<typeof envSchema>;

let envConfig: EnvConfig;

export function validateEnv() {
  const parsed = envSchema.safeParse(process.env);
  
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.format());
    process.exit(1);
  }
  
  if (process.env.MOCK_AI === 'true' && (parsed.data.NODE_ENV === 'development' || parsed.data.NODE_ENV === 'production')) {
    console.error('❌ Configuration error: Mock AI provider is restricted to test environment only.');
    process.exit(1);
  }
  
  envConfig = parsed.data;
}

export function getEnv() {
  if (!envConfig) {
    validateEnv();
  }
  return envConfig;
}
