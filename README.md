# ACM Contest Review Portal

A full-stack internal tool for reviewing, analyzing, and managing ACM coding contest submissions pulled from HackerRank. Built for club organizers to track participant progress, flag suspicious activity, sync live leaderboards, and share public results — all from a single dashboard.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Access Control](#access-control)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Deployment](#deployment)

---

## Overview

The portal connects to HackerRank's internal API using a session cookie, pulls all submissions for a given contest, stores them in a PostgreSQL database via Prisma, and exposes a rich admin dashboard for reviewing code, flagging participants, comparing solutions, and exporting results as PDF.

The public-facing leaderboard is completely separate from the admin interface and only shows contests that have been explicitly toggled public — with slugs hidden from the URL bar.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma 5 |
| UI | Tailwind CSS v4, shadcn/ui, Radix Base UI |
| Data Fetching | TanStack Query v5 |
| Table | TanStack Table v8, TanStack Virtual v3 |
| Charts | Recharts |
| Code Editor | Monaco Editor |
| Animations | Framer Motion |
| Notifications | Sonner |
| PDF Export | jsPDF + jsPDF-autotable |
| Zip Downloads | JSZip |
| Deployment | Vercel |

---

## Features

### Admin Panel (behind `/spiderman` auth)
- **Live Sync** — pull all submissions and leaderboard data from HackerRank in the background with real-time progress tracking via SSE
- **Contest Management** — create, edit, delete contests; control nav visibility and public leaderboard exposure per contest
- **Code Review** — view source code with Monaco editor, mark submissions reviewed/flagged, add notes and reasons
- **Participant Browser** — per-participant submission history, problem-by-problem breakdown, flag management
- **Submission Compare** — side-by-side diff view of two submissions
- **Flagged Dashboard** — dedicated view for all flagged participants across contests
- **Analytics** — participation stats, problem difficulty curves, score distributions
- **Week Filter** — filter all data by contest week
- **Replay Mode** — replay submission timeline over time
- **PDF Export** — export full leaderboard with rankings as a formatted PDF
- **Question Download** — download problem statements and test cases as a ZIP
- **Command Palette** — keyboard-driven navigation (⌘K / Ctrl+K)
- **Sync Status Badge** — live sync progress indicator in the header

### Public Leaderboard (`/public/leaderboard`)
- Admins toggle which contests are publicly visible (per-contest `isPublic` flag)
- Multiple public contests shown as tabs — **contest slugs are never in the URL bar**
- Direct slug-based URL access silently redirects to `/public/leaderboard`
- API route also checks `isPublic` — blocked at both page and data layer
- "Nothing to see here" state when no contests are marked public

### Infrastructure
- **Supabase Pause Prevention** — Vercel cron job hits `/api/keep-alive` daily, pinging the DB to prevent Supabase free-tier pausing (which happens after 7 days inactivity)
- **Edge Middleware Auth** — all non-public routes gated by a secure `httpOnly` session cookie set at `/spiderman`

---

## Architecture

```
Browser
  │
  ├─ /spiderman          → Password prompt → sets httpOnly session cookie
  │
  ├─ /  (admin)          → ContestBoard (full review dashboard)
  ├─ /participants/[u]   → Per-participant deep dive
  ├─ /submissions/[id]   → Single submission viewer + review
  ├─ /submissions/compare → Side-by-side diff
  ├─ /flagged            → All flagged participants
  ├─ /settings           → Contest management (CRUD + toggles)
  │
  └─ /public/leaderboard → Public tabs (slug hidden from URL)
       └─ /[slug]        → Silently redirects back to index

src/middleware.ts (Edge)
  └─ Checks acm_admin_session cookie → redirect to /spiderman if missing

src/services/
  ├─ HackerRankClient    → Authenticated HTTP client for HackerRank APIs
  ├─ SyncEngine          → Orchestrates full contest sync: leaderboard → challenges → submissions → source
  ├─ ParticipantService  → Per-user stats, submission history, problem breakdown
  ├─ LeaderboardService  → Ranked leaderboard with flag status
  ├─ ReviewService       → Mark reviewed, flag/unflag, notes
  ├─ AnalyticsService    → Aggregated stats and charts data
  ├─ SearchService       → Full-text search across participants/submissions
  ├─ DownloadQueue       → Background source code downloader
  ├─ ReplayService       → Submission timeline reconstruction
  └─ ProblemService      → Problem metadata and test case management
```

---

## Project Structure

```
acm-contest-review/
├── prisma/
│   ├── schema.prisma          # Database schema (all models)
│   └── seed.ts                # Seed script — creates default contests
│
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout — fonts, providers, shell
│   │   ├── page.tsx           # Admin home — renders ContestBoard
│   │   │
│   │   ├── spiderman/
│   │   │   └── page.tsx       # Password login page (admin access gate)
│   │   │
│   │   ├── flagged/
│   │   │   └── page.tsx       # All flagged participants view
│   │   │
│   │   ├── participants/
│   │   │   └── [username]/
│   │   │       └── page.tsx   # Per-participant profile + submissions
│   │   │
│   │   ├── submissions/
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx   # Single submission review view
│   │   │   └── compare/
│   │   │       └── page.tsx   # Side-by-side submission compare
│   │   │
│   │   ├── settings/
│   │   │   └── page.tsx       # Contest management admin panel
│   │   │
│   │   ├── public/
│   │   │   └── leaderboard/
│   │   │       ├── page.tsx                  # Public leaderboard index (tabs or empty state)
│   │   │       ├── public-leaderboard-tabs.tsx # Client tab switcher
│   │   │       └── [slug]/
│   │   │           └── page.tsx              # Redirects to index (hides slug from URL)
│   │   │
│   │   └── api/
│   │       ├── auth/route.ts              # POST: validate password → set cookie; DELETE: logout
│   │       ├── keep-alive/route.ts        # GET: DB ping for Supabase pause prevention
│   │       ├── health/route.ts            # GET: health check
│   │       ├── contests/route.ts          # CRUD for contests (GET/POST/PUT/DELETE)
│   │       ├── leaderboard/route.ts       # Admin leaderboard data
│   │       ├── participants/route.ts      # Participant list
│   │       ├── participant-flags/route.ts # Flag/unflag participant
│   │       ├── problems/route.ts          # Problem list per contest
│   │       ├── submissions/route.ts       # Submission list + filtering
│   │       ├── reviews/route.ts           # Review CRUD
│   │       ├── search/route.ts            # Search endpoint
│   │       ├── analytics/route.ts         # Analytics aggregates
│   │       ├── replay/route.ts            # Replay timeline data
│   │       ├── sync/route.ts              # Sync status/progress (SSE)
│   │       ├── internal/sync/route.ts     # Trigger background sync
│   │       └── public/
│   │           └── leaderboard/route.ts   # Public leaderboard data (isPublic-gated)
│   │
│   ├── components/
│   │   ├── contest-board.tsx              # Main admin dashboard (tabs, filters, table)
│   │   ├── public-contest-board.tsx       # Public leaderboard table
│   │   ├── layout/
│   │   │   ├── header.tsx                 # Top nav with contest tabs, sync badge
│   │   │   └── shell.tsx                  # Page shell wrapper
│   │   ├── shared/
│   │   │   ├── command-palette.tsx        # ⌘K command palette
│   │   │   ├── compare-modal.tsx          # Submission diff modal
│   │   │   ├── export-pdf-modal.tsx       # PDF export dialog
│   │   │   ├── flag-participant-modal.tsx # Flag/unflag dialog
│   │   │   ├── sync-status-badge.tsx      # Live sync progress badge
│   │   │   ├── empty-state.tsx            # Reusable empty state
│   │   │   └── loading.tsx                # Loading skeleton
│   │   └── ui/                            # shadcn/ui primitives (button, input, tooltip, etc.)
│   │
│   ├── services/
│   │   ├── sync-engine.ts           # Core sync orchestrator (leaderboard + submissions)
│   │   ├── hackerrank-client.ts     # HackerRank API client (cookie auth, retry logic)
│   │   ├── participant-service.ts   # Per-user stats and history
│   │   ├── leaderboard-service.ts   # Ranked leaderboard assembly
│   │   ├── review-service.ts        # Code review state management
│   │   ├── analytics-service.ts     # Aggregated stats
│   │   ├── search-service.ts        # Text search
│   │   ├── submission-service.ts    # Submission queries
│   │   ├── problem-service.ts       # Problem + test case management
│   │   ├── replay-service.ts        # Submission timeline
│   │   └── download-queue.ts        # Background source code downloader
│   │
│   ├── hooks/
│   │   ├── use-sync.ts              # Sync trigger + SSE progress listener
│   │   ├── use-participants.ts      # Paginated participant list
│   │   ├── use-submissions.ts       # Submission queries with filters
│   │   ├── use-problems.ts          # Problem list per contest/week
│   │   ├── use-review-queue.ts      # Review queue management
│   │   ├── use-prefetch-submissions.ts # Prefetch on hover
│   │   ├── use-replay.ts            # Replay playback state
│   │   ├── use-analytics.ts         # Analytics data hook
│   │   ├── use-keyboard-shortcuts.ts # Global keybindings
│   │   ├── use-debounce.ts          # Input debounce utility
│   │   └── use-week-filter.ts       # Active week filter context hook
│   │
│   ├── providers/
│   │   ├── contest-provider.tsx     # Active contest context (localStorage-persisted)
│   │   ├── query-provider.tsx       # TanStack Query client provider
│   │   └── week-filter-provider.tsx # Week filter context
│   │
│   ├── lib/
│   │   ├── prisma.ts               # Prisma client singleton
│   │   ├── cache.ts                # In-memory stats cache
│   │   ├── constants.ts            # HackerRank base URL, config constants
│   │   ├── computed-queries.ts     # Shared complex Prisma queries
│   │   ├── generate-results-pdf.ts # jsPDF leaderboard PDF generator
│   │   ├── query-client.ts         # TanStack Query client config
│   │   └── utils.ts                # cn() and general utilities
│   │
│   ├── types/
│   │   ├── hackerrank.ts           # HackerRank API response types
│   │   └── sync.ts                 # Sync progress event types (SSE)
│   │
│   └── middleware.ts               # Edge middleware — auth gate for all non-public routes
│
├── vercel.json                     # Vercel cron: hits /api/keep-alive daily
├── next.config.ts                  # Next.js config
└── package.json                    # Dependencies and scripts
```

---

## Database Schema

### `Contest`
| Field | Type | Description |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `name` | String | Display name |
| `slug` | String (unique) | HackerRank contest URL slug |
| `description` | String? | Optional description |
| `enabled` | Boolean | Whether the contest is active |
| `showInNav` | Boolean | Whether to show in top nav bar |
| `isPublic` | Boolean | Whether to show on public leaderboard |
| `icon` | String? | Emoji icon |
| `displayOrder` | Int | Sort order in nav |
| `lastSync` | DateTime? | Last successful sync timestamp |

### `User`
Stores HackerRank participants by username.

### `Problem`
Per-contest problems with week number and max score. Unique on `(slug, contestId)`.

### `Submission`
Every submission pulled from HackerRank — language, status, score, time, `isLatestAccepted` flag, `duringContest` flag.

### `Review`
One-to-one with `Submission` — `reviewed`, `flagged`, `reason`, `notes`, `reviewedAt`.

### `SourceCodeCache`
Stores downloaded source code per submission. Status: `PENDING | DOWNLOADED | FAILED`.

### `LeaderboardEntry`
Snapshot of official and HackerRank rank, score, time, avatar, country per participant per contest.

### `ParticipantFlag`
Admin-created flags on a participant per contest with reason and notes. Unique on `(userId, contestId)`.

### `SyncLog`
Tracks every sync run — phase, counts, duration, error message, status (`in_progress | success | error`).

---

## API Reference

### Public (no auth required)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/public/leaderboard?contest=<slug>` | Public leaderboard data — returns 403 if contest is not `isPublic` |
| `GET` | `/api/keep-alive` | DB ping for Supabase pause prevention (called by Vercel cron) |
| `GET` | `/api/health` | Health check — returns DB status |

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth` | `{ password }` → validates and sets `acm_admin_session` cookie |
| `DELETE` | `/api/auth` | Clears session cookie (logout) |

### Admin (requires session cookie)
| Method | Endpoint | Description |
|---|---|---|
| `GET/POST/PUT/DELETE` | `/api/contests` | Contest CRUD |
| `GET` | `/api/leaderboard?contest=<slug>` | Full admin leaderboard with review state |
| `GET` | `/api/participants?contest=<slug>` | Participant list |
| `GET/POST/DELETE` | `/api/participant-flags` | Flag management |
| `GET` | `/api/problems?contest=<slug>` | Problem list |
| `GET` | `/api/submissions` | Submissions with filters |
| `GET/POST` | `/api/reviews` | Review state management |
| `GET` | `/api/search?q=<query>` | Full-text search |
| `GET` | `/api/analytics?contest=<slug>` | Analytics aggregates |
| `GET` | `/api/replay?contest=<slug>` | Submission timeline |
| `GET` | `/api/sync` | SSE stream — live sync progress events |
| `POST` | `/api/internal/sync` | Trigger background sync for a contest |
| `GET` | `/api/contests/download-questions?slug=<slug>` | Download problem ZIP |

---

## Access Control

```
Public
  /public/leaderboard          → Always accessible
  /api/public/leaderboard      → Accessible, but gated by contest.isPublic
  /api/keep-alive              → Always accessible (cron)
  /api/health                  → Always accessible
  /spiderman                   → Login page (no auth needed)
  /api/auth                    → Login/logout endpoint

Protected (requires acm_admin_session cookie)
  /  and all other routes      → Redirects to /spiderman if no valid session
```

The session cookie is `httpOnly`, `SameSite: strict`, and expires after 24 hours.  
Password is validated server-side in `/api/auth`. The session is **not** JWT — it is a simple server-checked cookie value.

---

## Environment Variables

Create a `.env` file at the project root:

```env
# Supabase / PostgreSQL
DATABASE_URL="postgresql://..."       # Pooled connection (pgBouncer)
DIRECT_URL="postgresql://..."         # Direct connection (for migrations)

# HackerRank
HR_SESSION_COOKIE="your_hrank_session_cookie_value"
```

### How to get `HR_SESSION_COOKIE`
1. Log into [hackerrank.com](https://hackerrank.com) in your browser
2. Open DevTools → Application → Cookies
3. Copy the value of `_hrank_session`
4. Paste it as the value of `HR_SESSION_COOKIE`

> **Note:** This cookie expires periodically. If sync stops working, refresh the cookie.

---

## Getting Started

### Prerequisites
- Node.js 20+
- A Supabase project (or any PostgreSQL instance)
- A HackerRank account with access to the target contest

### Installation

```bash
# Clone the repo
git clone https://github.com/F0RREALTHO/acm-contest-review.git
cd acm-contest-review

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL, DIRECT_URL, HR_SESSION_COOKIE

# Push schema to database
npx prisma db push

# (Optional) Seed default contests
npx prisma db seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Navigate to `/spiderman` and enter the admin password to access the dashboard.

### First sync
1. Go to **Settings** → add your contest (name + HackerRank slug)
2. Click the **⟳ Sync** button next to the contest
3. Watch real-time progress in the sync badge (top right)
4. Once done, navigate back to the dashboard to see the leaderboard

---

## Deployment

The project is deployed on **Vercel**.

### Steps
1. Push to GitHub
2. Connect the repo to Vercel
3. Add environment variables in Vercel dashboard:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `HR_SESSION_COOKIE`
4. Deploy

### Vercel Cron (Supabase Pause Prevention)

`vercel.json` configures a daily cron job:

```json
{
  "crons": [
    {
      "path": "/api/keep-alive",
      "schedule": "0 0 * * *"
    }
  ]
}
```

This pings the database once per day, preventing Supabase from pausing the project due to inactivity (free tier pauses after 7 days with no activity).

> **Note:** Vercel Hobby plan supports cron jobs running at most once per day.

---

## Scripts

```bash
npm run dev      # Start local dev server
npm run build    # Generate Prisma client + build for production
npm run start    # Start production server
npm run lint     # Run ESLint
npx prisma db push    # Push schema changes to DB (no migration files)
npx prisma db seed    # Seed default contest data
npx prisma studio     # Open Prisma Studio (DB GUI)
```
