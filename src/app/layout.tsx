import './globals.css'
import type { ReactNode } from 'react'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container py-6">
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold">PulseBoard</h1>
            <nav className="space-x-4 text-sm">
              <a className="hover:underline" href="/">Overview</a>
              <a className="hover:underline" href="/events">Events</a>
              <a className="hover:underline" href="/explorer">Explorer</a>
              <a className="hover:underline" href="/funnels">Funnels</a>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  )
}

