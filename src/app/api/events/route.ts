import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { env } from '@/lib/env'
import { getClickHouseClient } from '@/lib/clickhouse/client'
import { IngestEventSchema, IngestBatchSchema, normalizeEvent } from '@/lib/contracts/event'

const SingleOrBatch = z.union([IngestEventSchema, IngestBatchSchema])

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token || token !== env.INGEST_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = SingleOrBatch.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const isBatch = 'events' in parsed.data
  const idempotencyKey = isBatch ? parsed.data.idempotencyKey : undefined

  if (idempotencyKey) {
    const existing = await prisma.ingestRequest.findUnique({ where: { idempotencyKey } })
    if (existing) {
      return NextResponse.json({ status: 'duplicate' })
    }
  }

  const events = (isBatch ? parsed.data.events : [parsed.data]).map((e) => normalizeEvent(e as any, idempotencyKey))
  const first = events[0]

  const ingest = await prisma.ingestRequest.create({
    data: {
      idempotencyKey: idempotencyKey ?? null,
      status: 'ACCEPTED',
      reason: null,
      eventName: first.event_name,
      userId: first.user_id,
      anonymousId: first.anonymous_id,
      timestamp: first.timestamp,
    }
  })

  // Ensure EventDefinition exists (for all unique names in batch)
  const names = Array.from(new Set(events.map((e) => e.event_name)))
  await Promise.all(
    names.map((name) =>
      prisma.eventDefinition.upsert({ where: { name }, update: {}, create: { name } })
    )
  )

  const ch = getClickHouseClient()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const values = events.map((e) => ({
      event_id: e.event_id,
      event_name: e.event_name,
      // ClickHouse prefers 'YYYY-MM-DD HH:MM:SS.mmm' for DateTime64
      timestamp: e.timestamp.toISOString().replace('T', ' ').replace('Z', ''),
      user_id: e.user_id,
      anonymous_id: e.anonymous_id,
      session_id: e.session_id,
      source: e.source,
      properties: JSON.stringify(e.properties),
      ingest_idempotency_key: e.ingest_idempotency_key,
    }))
    await ch.insert({
      table: `${env.CLICKHOUSE_DB}.events`,
      values,
      format: 'JSONEachRow',
      abort_signal: controller.signal
    })
    clearTimeout(timeout)
    return NextResponse.json({ status: 'ok', inserted: values.length, ingestId: ingest.id })
  } catch (err: any) {
    clearTimeout(timeout)
    await prisma.ingestRequest.update({
      where: { id: ingest.id },
      data: { status: 'REJECTED', reason: err?.message?.slice(0, 500) ?? 'ClickHouse insert failed' }
    })
    return NextResponse.json({ error: 'Upstream insertion failed' }, { status: 502 })
  }
}
