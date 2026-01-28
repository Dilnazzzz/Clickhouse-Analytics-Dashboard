import { getDAU, getTopEvents, getWAU } from '@/lib/analytics/queries'

function range(days: number) {
  const to = new Date()
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
  return { from, to }
}

export default async function OverviewPage() {
  const r7 = range(7)
  const [dauRows, wau, top] = await Promise.all([
    getDAU(r7),
    getWAU(r7),
    getTopEvents({ ...r7, limit: 5 })
  ])

  const dauToday = dauRows.at(-1)?.dau ?? 0
  const total7d = top.reduce((acc, r) => acc + r.cnt, 0)

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-medium">Overview (last 7 days)</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded border p-4">
          <div className="text-sm text-gray-500">DAU (today)</div>
          <div className="text-2xl font-semibold">{dauToday}</div>
        </div>
        <div className="rounded border p-4">
          <div className="text-sm text-gray-500">WAU (last 7d)</div>
          <div className="text-2xl font-semibold">{wau}</div>
        </div>
        <div className="rounded border p-4">
          <div className="text-sm text-gray-500">Total events (top-5 sum)</div>
          <div className="text-2xl font-semibold">{total7d}</div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Top events</h3>
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
                <td className="py-2">{t.event_name}</td>
                <td className="py-2">{t.cnt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

