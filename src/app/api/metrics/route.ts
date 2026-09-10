import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getClickHouseClient } from '@/lib/clickhouse/client'

export const dynamic = 'force-dynamic'

// GET /api/metrics — operational metrics for the ingest pipeline and stores.
// Distinct from the product analytics dashboard: this is about the health of
// the system itself (ingest throughput, rejection/dedup rate, table size).
export async function GET() {
  const ch = getClickHouseClient()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [total, last24hRs, ingest] = await Promise.all([
    ch
      .query({ query: 'SELECT count() AS c FROM events', format: 'JSONEachRow' })
      .then((r) => r.json<{ c: string }[]>()),
    ch
      .query({
        query: `SELECT count() AS c FROM events WHERE timestamp >= toDateTime64(${since.getTime()} / 1000, 3, 'UTC')`,
        format: 'JSONEachRow',
      })
      .then((r) => r.json<{ c: string }[]>()),
    prisma.ingestRequest.groupBy({ by: ['status'], _count: { _all: true } }),
  ])

  const ingestByStatus: Record<string, number> = {}
  for (const row of ingest) ingestByStatus[row.status] = row._count._all
  const ingestTotal = Object.values(ingestByStatus).reduce((a, b) => a + b, 0)
  const accepted = ingestByStatus['ACCEPTED'] ?? 0

  return NextResponse.json({
    events: {
      total: Number(total[0]?.c ?? 0),
      last24h: Number(last24hRs[0]?.c ?? 0),
    },
    ingest: {
      total: ingestTotal,
      byStatus: ingestByStatus,
      acceptanceRate: ingestTotal > 0 ? accepted / ingestTotal : 1,
    },
  })
}
