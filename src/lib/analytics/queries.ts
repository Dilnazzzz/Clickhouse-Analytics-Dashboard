import { getClickHouseClient } from '@/lib/clickhouse/client'
import { actorExpr, getAliasMap } from './identity'

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
  // ClickHouse count()/UInt64 serializes to a JSON string; coerce so callers
  // get real numbers (otherwise summing top-N string-concatenates them).
  const rows = await rs.json<{ event_name: string; cnt: string | number }[]>()
  return rows.map((r) => ({ event_name: r.event_name, cnt: Number(r.cnt) }))
}

export async function getDAU(params: Range) {
  const ch = getClickHouseClient()
  const actor = actorExpr(await getAliasMap())
  const query = `
    SELECT toDate(timestamp, 'UTC') AS day,
           uniqExact(${actor}) AS dau
    FROM events
    WHERE timestamp >= toDateTime64(${params.from.getTime()} / 1000, 3, 'UTC')
      AND timestamp < toDateTime64(${params.to.getTime()} / 1000, 3, 'UTC')
    GROUP BY day
    ORDER BY day ASC
  `
  const rs = await ch.query({ query, format: 'JSONEachRow' })
  const rows = await rs.json<{ day: string; dau: string | number }[]>()
  return rows.map((r) => ({ day: r.day, dau: Number(r.dau) }))
}

export async function getWAU(params: Range) {
  const ch = getClickHouseClient()
  const actor = actorExpr(await getAliasMap())
  const query = `
    SELECT uniqExact(${actor}) AS wau
    FROM events
    WHERE timestamp >= toDateTime64(${params.from.getTime()} / 1000, 3, 'UTC')
      AND timestamp < toDateTime64(${params.to.getTime()} / 1000, 3, 'UTC')
  `
  const rs = await ch.query({ query, format: 'JSONEachRow' })
  const rows = await rs.json<{ wau: string | number }[]>()
  return Number(rows[0]?.wau ?? 0)
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
  // minIf over zero matching rows returns the DateTime epoch default, NOT null,
  // so an actor who never fired a step would still pass a `ts IS NOT NULL`
  // check. Track presence explicitly with a has-flag per step, and require the
  // full ordered chain ts1 <= ts2 <= … <= ts_i for step i (first-occurrence
  // sequencing, matching computeFunnelConversion).
  const cols = steps
    .map(
      (name, i) =>
        `minIf(timestamp, event_name = '${esc(name)}') AS ts${i + 1}, ` +
        `maxIf(toUInt8(1), event_name = '${esc(name)}') AS has${i + 1}`,
    )
    .join(', ')
  const conditions: string[] = []
  conditions.push(`countIf(has1 = 1) AS step_1`)
  for (let i = 2; i <= steps.length; i++) {
    const has = Array.from({ length: i }, (_, k) => `has${k + 1} = 1`).join(' AND ')
    const ordered = Array.from({ length: i - 1 }, (_, k) => `ts${k + 1} <= ts${k + 2}`).join(' AND ')
    conditions.push(`countIf(${has} AND ${ordered}) AS step_${i}`)
  }
  const query = `
    WITH base AS (
      SELECT
        ${actorExpr(await getAliasMap())} AS actor,
        ${cols}
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
  const counts = steps.map((_, i) => Number(row[0][`step_${i + 1}`] ?? 0))
  return counts.map((count, i) => ({
    step: steps[i],
    count,
    conversion: counts[0] > 0 ? count / counts[0] : 0
  }))
}
