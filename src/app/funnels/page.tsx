'use server'

import { prisma } from '@/lib/db/prisma'
import { getFunnelStats } from '@/lib/analytics/queries'

async function createFunnel(formData: FormData) {
  'use server'
  const name = String(formData.get('name') || '')
  const steps = String(formData.get('steps') || '')
  const stepsArr = steps.split(',').map((s) => s.trim()).filter(Boolean)
  if (!name || stepsArr.length === 0) return
  await prisma.funnel.create({ data: { name, stepsJson: stepsArr as unknown as any } })
}

function lastNDays(n: number) {
  const to = new Date()
  const from = new Date(to.getTime() - n * 86400_000)
  return { from, to }
}

export default async function FunnelsPage() {
  const funnels = await prisma.funnel.findMany({ orderBy: { createdAt: 'desc' } })
  const r14 = lastNDays(14)

  const results = await Promise.all(
    funnels.map(async (f) => ({
      id: f.id,
      name: f.name,
      steps: (f.stepsJson as unknown as string[]),
      stats: await getFunnelStats(f.stepsJson as unknown as string[], r14)
    }))
  )

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-medium">Funnels</h2>

      <form action={createFunnel} className="rounded border p-4 space-y-2">
        <div className="text-sm font-medium">Create funnel</div>
        <input name="name" placeholder="Name" className="border rounded px-2 py-1 w-full" />
        <input name="steps" placeholder="Comma-separated steps (e.g. signup_started, signup_completed)" className="border rounded px-2 py-1 w-full" />
        <button type="submit" className="bg-black text-white rounded px-3 py-1 text-sm">Create</button>
      </form>

      <div className="space-y-4">
        {results.map((r) => (
          <div key={r.id} className="rounded border p-4">
            <div className="font-medium mb-2">{r.name}</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-1">Step</th>
                  <th className="py-1">Count</th>
                  <th className="py-1">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {r.stats.map((s, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-1">{s.step}</td>
                    <td className="py-1">{s.count}</td>
                    <td className="py-1">{(s.conversion * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}

