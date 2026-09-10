import { NextResponse } from 'next/server'
import { readFileSync } from 'node:fs'
import path from 'node:path'

// GET /api/openapi — serve the OpenAPI spec so the ingest API is
// self-documenting (paste the URL into any OpenAPI/Swagger viewer).
export function GET() {
  const yaml = readFileSync(path.join(process.cwd(), 'openapi.yaml'), 'utf-8')
  return new NextResponse(yaml, { headers: { 'Content-Type': 'application/yaml' } })
}
