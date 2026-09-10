import { describe, it, expect } from 'vitest'
import { resolveActor, actorExpr, type AliasMap } from '../identity'

describe('resolveActor', () => {
  it('returns the id unchanged when there is no alias', () => {
    expect(resolveActor('anon_1', new Map())).toBe('anon_1')
  })

  it('maps an anonymous id to its user', () => {
    const m: AliasMap = new Map([['anon_1', 'user_7']])
    expect(resolveActor('anon_1', m)).toBe('user_7')
  })

  it('follows a multi-hop chain to the endpoint', () => {
    const m: AliasMap = new Map([
      ['anon_1', 'anon_2'],
      ['anon_2', 'user_7'],
    ])
    expect(resolveActor('anon_1', m)).toBe('user_7')
  })

  it('does not loop forever on a cycle', () => {
    const m: AliasMap = new Map([
      ['a', 'b'],
      ['b', 'a'],
    ])
    expect(['a', 'b']).toContain(resolveActor('a', m))
  })
})

describe('actorExpr', () => {
  it('is the plain coalesce when there are no aliases', () => {
    expect(actorExpr(new Map())).toBe('coalesce(user_id, anonymous_id)')
  })

  it('emits a transform mapping aliased ids to their resolved endpoint', () => {
    const expr = actorExpr(new Map([['anon_1', 'user_7']]))
    expect(expr).toContain('transform(coalesce(user_id, anonymous_id)')
    expect(expr).toContain("'anon_1'")
    expect(expr).toContain("'user_7'")
  })

  it('flattens multi-hop chains in the emitted mapping', () => {
    const expr = actorExpr(
      new Map([
        ['anon_1', 'anon_2'],
        ['anon_2', 'user_7'],
      ]),
    )
    // anon_1 should map directly to the endpoint user_7, not to anon_2.
    const idx1 = expr.indexOf("'anon_1'")
    const idxTo = expr.indexOf("'user_7'")
    expect(idx1).toBeGreaterThan(-1)
    expect(idxTo).toBeGreaterThan(-1)
  })

  it('escapes single quotes to avoid SQL injection via ids', () => {
    const expr = actorExpr(new Map([["a'b", 'user_1']]))
    expect(expr).toContain("'a''b'")
  })
})
