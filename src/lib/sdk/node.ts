import { env } from '@/lib/env'

type TrackOptions = {
  idempotencyKey?: string
  userId?: string
  anonymousId?: string
  sessionId?: string
  source?: 'web' | 'server' | 'mobile'
}

export async function track(eventName: string, properties: Record<string, unknown> = {}, opts: TrackOptions = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${env.INGEST_API_KEY}`
  }

  const body = {
    events: [
      {
        eventName,
        userId: opts.userId,
        anonymousId: opts.anonymousId,
        sessionId: opts.sessionId,
        source: opts.source ?? 'server',
        properties
      }
    ],
    idempotencyKey: opts.idempotencyKey
  }

  const res = await fetch(env.NEXT_PUBLIC_PULSEBOARD_INGEST_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(`track() failed: ${res.status}`)
  return res.json()
}

export function identify(userId: string) {
  return userId
}

export function setAnonymousId(anonymousId: string) {
  return anonymousId
}

