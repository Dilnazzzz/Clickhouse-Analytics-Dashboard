import { getClickHouseClient } from '@/lib/clickhouse/client'

type Range = { from: Date; to: Date }

export async function getTopEvents(params: Range & { limit?: number }) {
  const ch = getClickHouseClient()
  const limit = params.limit ?? 20
  const query = `
    SELECT event_name, count() AS cnt
    FROM events
    WHERE timestamp >= toDateTime64(${params.from.getTime()} / 1000, 3, 'UTC')
      AND timestamp < toDateTime64(${params.to.getTime()} / 1000, 3, 'UTC')
    GROUP BY event_name
    ORDER BY cnt DESC
    LIMIT ${limit}
  `
  const rs = await ch.query({ query, format: 'JSONEachRow' })
  return await rs.json<{ event_name: string; cnt: number }[]>()
}

export async function getDAU(params: Range) {
  const ch = getClickHouseClient()
  const query = `
    SELECT toDate(timestamp, 'UTC') AS day,
           uniqExact(coalesce(user_id, anonymous_id)) AS dau
    FROM events
    WHERE timestamp >= toDateTime64(${params.from.getTime()} / 1000, 3, 'UTC')
      AND timestamp < toDateTime64(${params.to.getTime()} / 1000, 3, 'UTC')
    GROUP BY day
    ORDER BY day ASC
  `
  const rs = await ch.query({ query, format: 'JSONEachRow' })
  return await rs.json<{ day: string; dau: number }[]>()
}

export async function getWAU(params: Range) {
  const ch = getClickHouseClient()
  const query = `
    SELECT uniqExact(coalesce(user_id, anonymous_id)) AS wau
    FROM events
    WHERE timestamp >= toDateTime64(${params.from.getTime()} / 1000, 3, 'UTC')
      AND timestamp < toDateTime64(${params.to.getTime()} / 1000, 3, 'UTC')
  `
  const rs = await ch.query({ query, format: 'JSONEachRow' })
  const rows = await rs.json<{ wau: number }[]>()
  return rows[0]?.wau ?? 0
}

export async function getEventStream(params: Range & {
  eventName?: string
  userId?: string
  anonymousId?: string
  limit?: number
  offset?: number
}) {
  const ch = getClickHouseClient()
  const limit = params.limit ?? 50
  const offset = params.offset ?? 0
  const where = [
    `timestamp >= toDateTime64(${params.from.getTime()} / 1000, 3, 'UTC')`,
    `timestamp < toDateTime64(${params.to.getTime()} / 1000, 3, 'UTC')`,
  ]
  if (params.eventName) where.push(`event_name = {event_name:String}`)
  if (params.userId) where.push(`user_id = {user_id:String}`)
  if (params.anonymousId) where.push(`anonymous_id = {anonymous_id:String}`)

  const query = `
    SELECT timestamp, event_name, user_id, anonymous_id, session_id, source, properties
    FROM events
    WHERE ${where.join(' AND ')}
    ORDER BY timestamp DESC
    LIMIT ${limit} OFFSET ${offset}
  `
  const rs = await ch.query({
    query,
    format: 'JSONEachRow',
    query_params: {
      event_name: params.eventName,
      user_id: params.userId,
      anonymous_id: params.anonymousId
    }
  })
  return await rs.json<{
    timestamp: string
    event_name: string
    user_id: string | null
    anonymous_id: string | null
    session_id: string | null
    source: string
    properties: string
  }[]>()
}

export async function getFunnelStats(steps: string[], range: Range) {
  if (steps.length === 0) return []
  const ch = getClickHouseClient()
  const esc = (s: string) => s.replace(/'/g, "''")
  const minCols = steps.map((name, i) => `minIf(timestamp, event_name = '${esc(name)}') AS ts${i + 1}`).join(', ')
  const conditions: string[] = []
  // step 1: has ts1
  conditions.push(`countIf(ts1 IS NOT NULL) AS step_1`)
  for (let i = 2; i <= steps.length; i++) {
    const prev = i - 1
    conditions.push(`countIf(ts${i} IS NOT NULL AND ts${prev} IS NOT NULL AND ts${i} >= ts${prev}) AS step_${i}`)
  }
  const query = `
    WITH base AS (
      SELECT
        coalesce(user_id, anonymous_id) AS actor,
        ${minCols}
      FROM events
      WHERE timestamp >= toDateTime64(${range.from.getTime()} / 1000, 3, 'UTC')
        AND timestamp < toDateTime64(${range.to.getTime()} / 1000, 3, 'UTC')
        AND event_name IN (${steps.map((s) => `'${esc(s)}'`).join(', ')})
      GROUP BY actor
    )
    SELECT ${conditions.join(', ')} FROM base
  `
  const rs = await ch.query({ query, format: 'JSONEachRow' })
  const row = await rs.json<Record<string, number>[]>()
  if (!row[0]) return []
  const counts = steps.map((_, i) => row[0][`step_${i + 1}`] || 0)
  return counts.map((count, i) => ({
    step: steps[i],
    count,
    conversion: i === 0 ? 1 : count / Math.max(1, counts[0])
  }))
}
