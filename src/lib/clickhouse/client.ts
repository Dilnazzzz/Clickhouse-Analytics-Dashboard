import { createClient, type ClickHouseClient } from '@clickhouse/client'
import { env } from '@/lib/env'

let client: ClickHouseClient | null = null

export function getClickHouseClient() {
  if (!client) {
    client = createClient({
      url: env.CLICKHOUSE_URL,
      username: env.CLICKHOUSE_USER,
      password: env.CLICKHOUSE_PASSWORD || undefined,
      database: env.CLICKHOUSE_DB
    })
  }
  return client
}

