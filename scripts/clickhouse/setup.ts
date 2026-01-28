import 'dotenv/config'
import { getClickHouseClient } from '@/lib/clickhouse/client'
import { env } from '@/lib/env'

async function main() {
  const ch = getClickHouseClient()
  const db = env.CLICKHOUSE_DB

  // Run statements separately (ClickHouse client disallows multi-statements)
  await ch.exec({ query: `CREATE DATABASE IF NOT EXISTS ${db}` })

  const createTable = `
    CREATE TABLE IF NOT EXISTS ${db}.events (
      event_id String,
      event_name LowCardinality(String),
      timestamp DateTime64(3, 'UTC'),
      user_id Nullable(String),
      anonymous_id Nullable(String),
      session_id Nullable(String),
      source LowCardinality(String),
      properties String,
      ingest_idempotency_key Nullable(String)
    )
    ENGINE = MergeTree
    PARTITION BY toYYYYMM(timestamp)
    ORDER BY (event_name, timestamp)
  `

  await ch.exec({ query: createTable })
  console.log('ClickHouse setup complete')
}

main().catch((err) => {
  console.error('ClickHouse setup failed', err)
  process.exit(1)
})
