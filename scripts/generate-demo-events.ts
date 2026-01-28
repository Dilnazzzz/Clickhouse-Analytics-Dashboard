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

async function main() {
  const users = Array.from({ length: 50 }, (_, i) => `user_${i + 1}`)
  const now = new Date()
  const days = 14

  const all: Event[] = []
  for (let d = days; d >= 1; d--) {
    const day = new Date(now.getTime() - d * 86400_000)
    for (const u of users) {
      // 70% active
      if (Math.random() < 0.7) {
        const sessionId = crypto.randomUUID()
        const started = { eventName: 'signup_started', userId: u, sessionId, properties: { plan: choice(['free','pro']) }, timestamp: new Date(day.getTime() + randInt(60*60*1000)).toISOString() }
        all.push(started)
        // 80% complete
        if (Math.random() < 0.8) {
          const completed = { eventName: 'signup_completed', userId: u, sessionId, timestamp: new Date(day.getTime() + randInt(2*60*60*1000)).toISOString() }
          all.push(completed)
          // 60% create project
          if (Math.random() < 0.6) {
            const firstProject = { eventName: 'first_project_created', userId: u, sessionId, properties: { template: choice(['kanban','blank']) }, timestamp: new Date(day.getTime() + randInt(3*60*60*1000)).toISOString() }
            all.push(firstProject)
          }
        }
        // background events
        const clicks = randInt(3)
        for (let i = 0; i < clicks; i++) {
          all.push({ eventName: 'button_clicked', userId: u, sessionId, properties: { id: choice(['save','share','delete']) }, timestamp: new Date(day.getTime() + randInt(4*60*60*1000)).toISOString() })
        }
      }
    }
  }

  // Send in batches of 50
  console.log(`Sending ${all.length} events ...`)
  const batchSize = 50
  for (let i = 0; i < all.length; i += batchSize) {
    const batch = all.slice(i, i + batchSize)
    const idempotencyKey = `demo_${i}_${batch.length}`
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

