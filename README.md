# PulseBoard (Mixpanel-lite)

PulseBoard is a minimal, production-ish internal analytics tool:

- Ingest product events with strict Zod validation and idempotency
- Store canonical metadata/config in Postgres (Prisma)
- Store raw events in ClickHouse
- Dashboard for DAU/WAU, top events, event explorer, and funnels

## Architecture

SDK → Ingest API → Postgres (idempotency/config) + ClickHouse (events) → Dashboard (Next.js)

Events are written only to ClickHouse (source of truth) while Postgres tracks ingest requests, event definitions, funnel configs, and saved reports.

## Tech

- Next.js 15 (App Router), TypeScript, Tailwind
- Prisma + Postgres
- ClickHouse (`@clickhouse/client`)
- Zod
- Vitest
- Docker Compose for local Postgres + ClickHouse

## Event Schema (ClickHouse)

Table `events` (MergeTree, partition by `toYYYYMM(timestamp)` order by `(event_name, timestamp)`):

- event_id String (UUID)
- event_name LowCardinality(String)
- timestamp DateTime64(3, 'UTC')
- user_id Nullable(String)
- anonymous_id Nullable(String)
- session_id Nullable(String)
- source LowCardinality(String)
- properties String (JSON string)
- ingest_idempotency_key Nullable(String)

## Metrics Definitions

- DAU: distinct users per day using `coalesce(user_id, anonymous_id)`
- WAU: distinct users in a 7-day window using the same coalesce

## Funnel Logic

For steps `[s1, s2, ...]` within a time range:

1. For each user (coalesced id), compute earliest timestamp per step
2. A user converts to step `i` if they have step `i` at time >= time of step `i-1`
3. Conversion per step is `count(step i) / count(step 1)`

Implemented as sequential CTEs in ClickHouse and unit-tested with a pure function.

## Local Setup

1. `cp .env.example .env`
2. `docker compose up -d` (Postgres + ClickHouse)
3. `npm install`
4. `npm run db:generate && npm run db:migrate`
5. `npm run ch:setup`
6. `npm run db:seed`
7. `npm run dev` (Next on http://localhost:3000)
8. Optional demo data: `tsx scripts/generate-demo-events.ts`

## Required Scripts

- `dev` → `next dev`
- `db:migrate` → `prisma migrate dev`
- `db:generate` → `prisma generate`
- `db:seed` → `tsx prisma/seed.ts`
- `ch:setup` → run ClickHouse DDL
- `test` → `vitest`

## Screens (MVP)

- Overview: DAU/WAU + top events
- Events: top events table with date filters
- Explorer: raw events, filters by event/user/anon
- Funnels: list/create funnels, show conversion

## Tests

- Zod ingestion rules (IDs required, naming rules)
- Funnel correctness on synthetic dataset

Run: `npm test`

## Scaling Notes

- Materialized views for common aggregates
- Further partitioning by event_name, or TTL for old partitions
- Batching inserts on ingest
- Consider `JSON`/`Object('json')` for typed properties with constraints

## Acceptance Criteria (MVP)

- `docker compose up` starts Postgres + ClickHouse cleanly
- `POST /api/events` accepts events and writes to ClickHouse
- Duplicate `idempotencyKey` returns `duplicate` and does not double insert
- Overview shows DAU/WAU + top events for a date range
- Event Explorer shows raw events with filters
- Funnels can be created and show conversion stats
- Seed/demo generator creates enough activity to make charts meaningful
- Tests pass (`npm test`)

