import { z } from 'zod'

const nameRegex = /^[a-z0-9_\.:-]+$/

export const IngestEventSchema = z.object({
  eventName: z.string().min(1).max(80).regex(nameRegex),
  timestamp: z.string().datetime().optional(),
  userId: z.string().optional(),
  anonymousId: z.string().optional(),
  sessionId: z.string().optional(),
  source: z.enum(['web', 'server', 'mobile']).default('web'),
  properties: z.record(z.any()).default({})
}).refine((v) => !!(v.userId || v.anonymousId), {
  message: 'Either userId or anonymousId is required'
})

export type IngestEventInput = z.infer<typeof IngestEventSchema>

export const IngestBatchSchema = z.object({
  events: z.array(IngestEventSchema).min(1).max(50),
  idempotencyKey: z.string().optional(),
  sentAt: z.string().datetime().optional()
})

export type IngestBatchInput = z.infer<typeof IngestBatchSchema>

export type NormalizedEvent = {
  event_id: string
  event_name: string
  timestamp: Date
  user_id: string | null
  anonymous_id: string | null
  session_id: string | null
  source: 'web' | 'server' | 'mobile'
  properties: Record<string, unknown>
  ingest_idempotency_key: string | null
}

export function normalizeEvent(input: IngestEventInput, idempotencyKey?: string): NormalizedEvent {
  const ts = input.timestamp ? new Date(input.timestamp) : new Date()
  return {
    event_id: globalThis.crypto?.randomUUID?.() ? globalThis.crypto.randomUUID() : require('crypto').randomUUID(),
    event_name: input.eventName,
    timestamp: new Date(ts.toISOString()), // ensure UTC
    user_id: input.userId ?? null,
    anonymous_id: input.anonymousId ?? null,
    session_id: input.sessionId ?? null,
    source: input.source,
    properties: input.properties ?? {},
    ingest_idempotency_key: idempotencyKey ?? null,
  }
}

