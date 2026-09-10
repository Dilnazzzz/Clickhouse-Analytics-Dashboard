import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getClickHouseClient } from '@/lib/clickhouse/client'

export const dynamic = 'force-dynamic'

// GET /api/health — liveness + dependency readiness for both data stores.
// Returns 200 when both are reachable, 503 otherwise, so a load balancer or
// uptime monitor can gate traffic. Each check is timed.
async function timed(fn: () => Promise<unknown>): Promise<{ ok: boolean; ms: number; error?: string }> {
  const start = Date.now()
  try {
    await fn()
    return { ok: true, ms: Date.now() - start }
  } catch (e) {
    return { ok: false, ms: Date.now() - start, error: e instanceof Error ? e.message : 'error' }
  }
}

export async function GET() {
  const [postgres, clickhouse] = await Promise.all([
    timed(() => prisma.$queryRaw`SELECT 1`),
    timed(async () => {
      const rs = await getClickHouseClient().query({ query: 'SELECT 1', format: 'JSONEachRow' })
      await rs.json()
    }),
  ])

  const ok = postgres.ok && clickhouse.ok
  return NextResponse.json(
    { status: ok ? 'healthy' : 'degraded', checks: { postgres, clickhouse } },
    { status: ok ? 200 : 503 },
  )
}
