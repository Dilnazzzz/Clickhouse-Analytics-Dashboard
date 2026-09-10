import 'dotenv/config'
import { env } from '@/lib/env'

type Event = {
  eventName: string
  userId?: string
  anonymousId?: string
  sessionId?: string
  source?: 'web' | 'server' | 'mobile'
  properties?: Record<string, unknown>
  timestamp?: string
}

function randInt(n: number) { return Math.floor(Math.random() * n) }
function choice<T>(arr: T[]) { return arr[randInt(arr.length)] }
function chance(p: number) { return Math.random() < p }

const SOURCES: Array<'web' | 'server' | 'mobile'> = ['web', 'web', 'web', 'mobile', 'server']

async function main() {
  const now = new Date()
  const days = 30

  // Each user is assigned a fixed archetype up front, so the acquisition funnel
  // shows real cohort drop-off (some users abandon signup forever, some sign up
  // but never activate) rather than everyone eventually completing every step.
  const users = Array.from({ length: 60 }, (_, i) => {
    const completesSignup = chance(0.78) // 22% abandon signup permanently
    return {
      id: `user_${i + 1}`,
      source: choice(SOURCES),
      completesSignup,
      createsProject: completesSignup && chance(0.66),
      activates: chance(0.85), // ever opens the app
      clicks: chance(0.62), // ever clicks something once opened
      signupDay: days - randInt(days), // the day this user first signed up
    }
  })
  const at = (day: Date, ms: number) => new Date(day.getTime() + ms).toISOString()

  const all: Event[] = []
  for (const u of users) {
    const signupDate = new Date(now.getTime() - u.signupDay * 86400_000)
    const session = crypto.randomUUID()

    // Acquisition funnel plays out in the user's first session.
    all.push({ eventName: 'signup_started', userId: u.id, sessionId: session, source: u.source, properties: { plan: choice(['free', 'free', 'pro']) }, timestamp: at(signupDate, randInt(30 * 60 * 1000)) })
    if (u.completesSignup) {
      all.push({ eventName: 'signup_completed', userId: u.id, sessionId: session, source: u.source, timestamp: at(signupDate, 30 * 60 * 1000 + randInt(60 * 60 * 1000)) })
      if (u.createsProject) {
        all.push({ eventName: 'first_project_created', userId: u.id, sessionId: session, source: u.source, properties: { template: choice(['kanban', 'blank', 'roadmap']) }, timestamp: at(signupDate, 90 * 60 * 1000 + randInt(90 * 60 * 1000)) })
      }
    }

    // Returning activity: only completed users come back on later days.
    if (!u.completesSignup) continue
    for (let d = u.signupDay - 1; d >= 0; d--) {
      const day = new Date(now.getTime() - d * 86400_000)
      const weekday = day.getUTCDay()
      const returnP = weekday === 0 || weekday === 6 ? 0.3 : 0.55 // weekends quieter
      if (!chance(returnP)) continue
      const s = crypto.randomUUID()
      if (u.activates) {
        all.push({ eventName: 'app_opened', userId: u.id, sessionId: s, source: u.source, timestamp: at(day, randInt(30 * 60 * 1000)) })
        if (u.clicks) {
          const n = 1 + randInt(4)
          for (let i = 0; i < n; i++) {
            all.push({ eventName: 'button_clicked', userId: u.id, sessionId: s, source: u.source, properties: { id: choice(['save', 'share', 'delete', 'invite']) }, timestamp: at(day, 30 * 60 * 1000 + randInt(2 * 60 * 60 * 1000)) })
          }
        }
      }
    }
  }

  // Send in batches. A per-run id keeps idempotency keys unique across reseeds
  // (re-running with the same keys would be deduped and insert nothing).
  const runId = Date.now().toString(36)
  console.log(`Sending ${all.length} events ...`)
  const batchSize = 50
  for (let i = 0; i < all.length; i += batchSize) {
    const batch = all.slice(i, i + batchSize)
    const idempotencyKey = `demo_${runId}_${i}`
    const res = await fetch(env.NEXT_PUBLIC_PULSEBOARD_INGEST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.INGEST_API_KEY}`
      },
      body: JSON.stringify({ events: batch, idempotencyKey })
    })
    if (!res.ok) {
      console.error('Batch failed', i, await res.text())
      break
    }
  }
  console.log('Demo generation complete')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

