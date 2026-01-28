export type SimpleEvent = {
  actor: string
  name: string
  ts: Date
}

export function computeFunnelConversion(steps: string[], events: SimpleEvent[]) {
  const byActor = new Map<string, SimpleEvent[]>()
  for (const e of events) {
    if (!byActor.has(e.actor)) byActor.set(e.actor, [])
    byActor.get(e.actor)!.push(e)
  }
  for (const [, arr] of byActor) arr.sort((a, b) => a.ts.getTime() - b.ts.getTime())

  const counts = new Array(steps.length).fill(0) as number[]
  for (const [, arr] of byActor) {
    let cursor = 0
    let lastTs = new Date(0)
    for (const ev of arr) {
      if (ev.name === steps[cursor] && ev.ts >= lastTs) {
        counts[cursor] += 1
        lastTs = ev.ts
        cursor += 1
        if (cursor >= steps.length) break
      }
    }
  }
  return counts.map((c, i) => ({ step: steps[i], count: c, conversion: i === 0 ? 1 : c / Math.max(1, counts[0]) }))
}

