type TrackOptions = {
  idempotencyKey?: string
  userId?: string
  anonymousId?: string
  sessionId?: string
  source?: 'web' | 'server' | 'mobile'
  apiKey?: string
  ingestUrl?: string
}

const ANON_KEY = 'pulseboard_anonymous_id'
const SESSION_KEY = 'pulseboard_session_id'

function getOrCreateId(key: string) {
  if (typeof window === 'undefined') return undefined
  let v = localStorage.getItem(key)
  if (!v) {
    v = crypto.randomUUID()
    localStorage.setItem(key, v)
  }
  return v
}

export function identify(userId: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('pulseboard_user_id', userId)
}

export function setAnonymousId(id: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(ANON_KEY, id)
}

export async function track(eventName: string, properties: Record<string, unknown> = {}, opts: TrackOptions = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (opts.apiKey) headers['Authorization'] = `Bearer ${opts.apiKey}`

  const userId = opts.userId || (typeof window !== 'undefined' ? localStorage.getItem('pulseboard_user_id') || undefined : undefined)
  const anonymousId = opts.anonymousId || getOrCreateId(ANON_KEY)
  const sessionId = opts.sessionId || getOrCreateId(SESSION_KEY)

  const body = {
    events: [
      {
        eventName,
        userId,
        anonymousId,
        sessionId,
        source: 'web' as const,
        properties
      }
    ],
    idempotencyKey: opts.idempotencyKey
  }

  const url = opts.ingestUrl || (typeof window !== 'undefined' ? (window as any).NEXT_PUBLIC_PULSEBOARD_INGEST_URL : undefined)
  if (!url) throw new Error('ingestUrl not provided')
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(`track() failed: ${res.status}`)
  return res.json()
}
