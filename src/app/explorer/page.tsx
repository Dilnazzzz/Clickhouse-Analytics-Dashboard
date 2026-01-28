import { getEventStream } from '@/lib/analytics/queries'

export const dynamic = 'force-dynamic'

function first(v: string | string[] | undefined | null): string | undefined {
  if (Array.isArray(v)) return v[0]
  return v ?? undefined
}

function parseParamsFromRecord(sp: Record<string, string | string[] | undefined>) {
  const toStr = first(sp['to'])
  const daysStr = first(sp['days'])
  const fromStr = first(sp['from'])
  const to = toStr ? new Date(String(toStr)) : new Date()
  const days = daysStr ? Number(daysStr) : 7
  const from = fromStr ? new Date(String(fromStr)) : new Date(to.getTime() - days * 86400_000)
  const eventName = first(sp['eventName'])
  const userId = first(sp['userId'])
  const anonymousId = first(sp['anonymousId'])
  const limitStr = first(sp['limit'])
  const offsetStr = first(sp['offset'])
  const limit = limitStr ? Number(limitStr) : 50
  const offset = offsetStr ? Number(offsetStr) : 0
  return { from, to, eventName, userId, anonymousId, limit, offset }
}

export default async function ExplorerPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const p = parseParamsFromRecord(sp)
  const rows = await getEventStream(p)
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-medium">Event Explorer</h2>
      <div className="text-sm text-gray-600">Range: {p.from.toISOString()} → {p.to.toISOString()}</div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600">
            <th className="py-2">Timestamp</th>
            <th className="py-2">Event</th>
            <th className="py-2">User/Anon</th>
            <th className="py-2">Source</th>
            <th className="py-2">Properties</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t align-top">
              <td className="py-2 pr-4 whitespace-nowrap">{new Date(r.timestamp).toISOString()}</td>
              <td className="py-2 pr-4">{r.event_name}</td>
              <td className="py-2 pr-4">{r.user_id ?? r.anonymous_id ?? '-'}</td>
              <td className="py-2 pr-4">{r.source}</td>
              <td className="py-2 pr-4 text-xs"><pre className="whitespace-pre-wrap break-all">{r.properties}</pre></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
