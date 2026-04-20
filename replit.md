# AuditIQ — AI-Powered Journal Entry Risk Scorer

## Overview

Full-stack SaaS application for auditors to upload journal entries (CSV/XLSX), score them across 5 risk dimensions, get Claude AI explanations for risky entries, and visualize risk through dashboards.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, TailwindCSS, shadcn/ui
- **AI**: Claude claude-sonnet-4-6 (Anthropic via Replit AI proxy)

## Architecture

```
artifacts/
  api-server/         — Express backend (port 8080)
  auditiq/            — React+Vite frontend (port from $PORT)
lib/
  api-spec/           — OpenAPI spec + orval config (codegen source)
  api-client-react/   — Generated React Query hooks + custom-fetch
  db/                 — Drizzle schema + migrations
  integrations-anthropic-ai/  — Anthropic AI client wrapper
```

## Key Features

- **JWT Auth** — Register/login with roles: ASSOCIATE, SENIOR, MANAGER
- **Engagements** — CRUD for audit engagements per client
- **File Upload** — CSV/XLSX journal entry upload (POST raw bytes, `application/octet-stream`)
- **Risk Engine** — 5-dimension scoring: Posting Time (25%), Amount (20%), User Concentration (20%), Keywords (20%), Frequency (10%)
- **Risk Levels** — HIGH (≥70), MEDIUM (40-69), LOW (<40)
- **AI Explanations** — Claude AI summaries for MEDIUM/HIGH entries (ISA 240, max 80 words)
- **Dashboard** — Summary stats, user/time heatmaps, Benford's Law analysis, duplicate detection
- **Reports** — PDF (HTML print) and CSV exports

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## API Route Map

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| POST | /api/auth/logout | Logout |
| GET/POST | /api/engagements | List / Create |
| GET/PATCH/DELETE | /api/engagements/:id | Detail / Update / Delete |
| POST | /api/engagements/:id/upload | Upload CSV/XLSX |
| GET | /api/engagements/:id/entries | List entries |
| GET | /api/entries/:entryId | Entry detail |
| POST | /api/entries/:entryId/explain | Generate AI explanation |
| PATCH | /api/entries/:entryId/override | Override risk level |
| GET | /api/engagements/:id/dashboard | Dashboard summary |
| GET | /api/engagements/:id/heatmap/users | User heatmap |
| GET | /api/engagements/:id/heatmap/time | Time heatmap |
| GET | /api/engagements/:id/risk-distribution | Risk distribution |
| GET | /api/engagements/:id/benford | Benford analysis |
| GET | /api/engagements/:id/duplicates | Duplicate detection |
| GET | /api/engagements/:id/report/pdf | PDF report |
| GET | /api/engagements/:id/report/excel | Excel (CSV) export |
| GET | /api/dashboard/overview | Overall portfolio |
| GET | /api/audit-logs | Audit trail |

## Important Implementation Notes

- Orval zod codegen requires `indexFiles: false` to avoid invalid index.ts
- Upload endpoint uses `application/octet-stream` — frontend must POST raw file bytes with `X-Filename` header
- JWT stored in `localStorage` key `auditiq_token`; `custom-fetch.ts` injects auth header automatically
- AI explanations only for MEDIUM+HIGH risk, max 80 words, reference ISA 240
- Risk badges: HIGH=red, MEDIUM=amber, LOW=green
- PDF report is HTML-based (print-to-PDF), Excel export is CSV
