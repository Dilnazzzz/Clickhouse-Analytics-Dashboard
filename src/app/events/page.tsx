import { getTopEvents } from '@/lib/analytics/queries'

export const dynamic = 'force-dynamic'

function first(v: string | string[] | undefined | null): string | undefined {
  if (Array.isArray(v)) return v[0]
  return v ?? undefined
}

function parseRangeFromRecord(sp: Record<string, string | string[] | undefined>) {
  const toStr = first(sp['to'])
  const daysStr = first(sp['days'])
  const fromStr = first(sp['from'])
  const to = toStr ? new Date(String(toStr)) : new Date()
  const days = daysStr ? Number(daysStr) : 7
  const from = fromStr ? new Date(String(fromStr)) : new Date(to.getTime() - days * 86400_000)
  return { from, to }
}

export default async function EventsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const { from, to } = parseRangeFromRecord(sp)
  const top = await getTopEvents({ from, to, limit: 20 })
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-medium">Events</h2>
      <div className="text-sm text-gray-600">Range: {from.toISOString()} → {to.toISOString()}</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600">
            <th className="py-2">Event</th>
            <th className="py-2">Count</th>
          </tr>
        </thead>
        <tbody>
          {top.map((t) => (
            <tr key={t.event_name} className="border-t">
              <td className="py-2"><a className="underline" href={`/explorer?eventName=${encodeURIComponent(t.event_name)}`}>{t.event_name}</a></td>
              <td className="py-2">{t.cnt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
