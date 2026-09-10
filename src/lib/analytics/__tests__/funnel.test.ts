import { describe, it, expect } from 'vitest'
import { computeFunnelConversion, type SimpleEvent } from '../../analytics/funnel'

describe('computeFunnelConversion', () => {
  it('computes simple 3-step funnel', () => {
    const steps = ['signup_started', 'signup_completed', 'first_project_created']
    const base = new Date('2024-01-01T00:00:00Z')
    const ev = (actor: string, name: string, t: number): SimpleEvent => ({ actor, name, ts: new Date(base.getTime() + t) })
    const data: SimpleEvent[] = [
      ev('u1', 'signup_started', 1000),
      ev('u1', 'signup_completed', 2000),
      ev('u1', 'first_project_created', 3000),
      ev('u2', 'signup_started', 1000),
      ev('u2', 'signup_completed', 2000),
      ev('u3', 'signup_started', 1000),
      ev('u3', 'first_project_created', 2500), // out of order should not count step2
    ]
    const res = computeFunnelConversion(steps, data)
    expect(res.map(r => r.count)).toEqual([3, 2, 1])
    expect(res[1].conversion).toBeCloseTo(2/3)
  })

  it('reports zero (not 100%) for a step no one reaches', () => {
    const steps = ['app_opened', 'button_clicked']
    const base = new Date('2024-01-01T00:00:00Z')
    const ev = (actor: string, name: string, t: number): SimpleEvent => ({ actor, name, ts: new Date(base.getTime() + t) })
    // Users only ever fired button_clicked — never app_opened (step 1).
    const data: SimpleEvent[] = [
      ev('u1', 'button_clicked', 1000),
      ev('u2', 'button_clicked', 1000),
    ]
    const res = computeFunnelConversion(steps, data)
    expect(res[0].count).toBe(0)
    expect(res[1].count).toBe(0)
    // Guards the regression where an unreached first step showed 100%.
    expect(res[0].conversion).toBe(0)
  })

  it('does not count a later step reached before the earlier one', () => {
    const steps = ['a', 'b']
    const base = new Date('2024-01-01T00:00:00Z')
    const ev = (actor: string, name: string, t: number): SimpleEvent => ({ actor, name, ts: new Date(base.getTime() + t) })
    const data: SimpleEvent[] = [
      ev('u1', 'b', 1000),
      ev('u1', 'a', 2000), // a after b — the ordered chain must not count b
    ]
    const res = computeFunnelConversion(steps, data)
    expect(res.map(r => r.count)).toEqual([1, 0])
  })
})

