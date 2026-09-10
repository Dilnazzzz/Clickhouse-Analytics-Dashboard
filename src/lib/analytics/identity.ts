import { prisma } from '@/lib/db/prisma'

// Identity stitching. Events are written immutably to ClickHouse keyed by the
// id present at capture time (user_id if known, else anonymous_id). When a
// visitor later logs in, we don't rewrite history — we record an alias
// (anonymous_id -> user_id) in Postgres and resolve it at query time, so an
// analytics "actor" is the stitched identity, not the raw capture id.

export type AliasMap = Map<string, string>

/** Resolve a raw capture id to its canonical actor via the alias map. */
export function resolveActor(rawId: string, aliases: AliasMap): string {
  // Follow the chain in case aliases point through intermediate ids, guarding
  // against cycles.
  const seen = new Set<string>()
  let id = rawId
  while (aliases.has(id) && !seen.has(id)) {
    seen.add(id)
    id = aliases.get(id)!
  }
  return id
}

/**
 * Build a ClickHouse SQL expression that maps the raw capture id to its
 * canonical actor using `transform(...)`. Anonymous ids with an alias collapse
 * to the user id; everything else passes through. Ids are single-quote-escaped.
 */
export function actorExpr(aliases: AliasMap): string {
  const raw = `coalesce(user_id, anonymous_id)`
  if (aliases.size === 0) return raw
  const esc = (s: string) => `'${s.replace(/'/g, "''")}'`
  // Resolve each source fully so multi-hop chains flatten to their endpoint.
  const froms: string[] = []
  const tos: string[] = []
  for (const [from] of aliases) {
    froms.push(esc(from))
    tos.push(esc(resolveActor(from, aliases)))
  }
  return `transform(${raw}, [${froms.join(', ')}], [${tos.join(', ')}], ${raw})`
}

/** Load the full alias map from Postgres (capped to keep query size bounded). */
export async function getAliasMap(limit = 5000): Promise<AliasMap> {
  const rows = await prisma.identityAlias.findMany({ take: limit, select: { anonymousId: true, userId: true } })
  return new Map(rows.map((r) => [r.anonymousId, r.userId]))
}
