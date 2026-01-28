import { z } from 'zod'

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  CLICKHOUSE_URL: z.string().url(),
  CLICKHOUSE_USER: z.string().default('default'),
  CLICKHOUSE_PASSWORD: z.string().optional().nullable(),
  CLICKHOUSE_DB: z.string().default('pulseboard'),
  INGEST_API_KEY: z.string().min(1),
  NEXT_PUBLIC_PULSEBOARD_INGEST_URL: z.string().url()
})

export const env = EnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  CLICKHOUSE_URL: process.env.CLICKHOUSE_URL,
  CLICKHOUSE_USER: process.env.CLICKHOUSE_USER,
  CLICKHOUSE_PASSWORD: process.env.CLICKHOUSE_PASSWORD ?? '',
  CLICKHOUSE_DB: process.env.CLICKHOUSE_DB ?? 'pulseboard',
  INGEST_API_KEY: process.env.INGEST_API_KEY,
  NEXT_PUBLIC_PULSEBOARD_INGEST_URL: process.env.NEXT_PUBLIC_PULSEBOARD_INGEST_URL
})

