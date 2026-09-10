import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { env } from '@/lib/env'

export const dynamic = 'force-dynamic'

// POST /api/identify — stitch an anonymous visitor to a known user.
// Records anonymous_id -> user_id so historical anonymous events resolve to the
// same actor in analytics (see lib/analytics/identity.ts).
const IdentifySchema = z.object({
  anonymousId: z.string().min(1),
  userId: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token || token !== env.INGEST_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = IdentifySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const { anonymousId, userId } = parsed.data
  if (anonymousId === userId) {
    return NextResponse.json({ error: 'anonymousId and userId must differ' }, { status: 400 })
  }

  const alias = await prisma.identityAlias.upsert({
    where: { anonymousId },
    update: { userId },
    create: { anonymousId, userId },
  })

  return NextResponse.json({ status: 'ok', anonymousId: alias.anonymousId, userId: alias.userId })
}
