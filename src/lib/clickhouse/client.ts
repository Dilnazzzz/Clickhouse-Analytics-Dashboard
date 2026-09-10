import { createClient, type ClickHouseClient } from '@clickhouse/client'
import { env } from '@/lib/env'

let client: ClickHouseClient | null = null

export function getClickHouseClient() {
  if (!client) {
    client = createClient({
      // `host` is the correct option in @clickhouse/client 0.2.x and accepts a
      // full URL; passing `url` here is silently ignored and defaults the
      // connection to http://localhost:8123, ignoring CLICKHOUSE_URL entirely.
      host: env.CLICKHOUSE_URL,
      username: env.CLICKHOUSE_USER,
      password: env.CLICKHOUSE_PASSWORD || undefined,
      database: env.CLICKHOUSE_DB
    })
  }
  return client
}

