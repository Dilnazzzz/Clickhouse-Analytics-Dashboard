import { describe, it, expect } from 'vitest'
import { IngestEventSchema } from '../../contracts/event'

describe('IngestEventSchema', () => {
  it('requires either userId or anonymousId', () => {
    const res = IngestEventSchema.safeParse({
      eventName: 'click',
      properties: {}
    })
    expect(res.success).toBe(false)
  })

  it('accepts valid naming', () => {
    const res = IngestEventSchema.safeParse({
      eventName: 'signup_started.v2:ab-test',
      anonymousId: 'anon-1'
    })
    expect(res.success).toBe(true)
  })

  it('rejects invalid naming', () => {
    const res = IngestEventSchema.safeParse({
      eventName: 'Sign Up',
      anonymousId: 'a'
    })
    expect(res.success).toBe(false)
  })
})

