# Architecture

See [README.md](README.md) for setup/run/deploy instructions. This document
covers how the app is built, the data model, the API, the test strategy, and
the tradeoffs made for a 4–6 hour timebox.

---

## Overview

A single Next.js app. The App Router's route handlers **are** the backend —
there is no separate API service. Pages and API routes share one origin, one
deploy, and one database connection pool, which is why there is no CORS
configuration and no API-base-URL environment variable anywhere in the code:
every fetch in the client is a relative `/api/...` path.

```
src/
├─ app/
│  ├─ layout.tsx                 # shell + <TopBar/> (user switcher)
│  ├─ page.tsx                   # redirect -> /documents
│  ├─ documents/page.tsx         # dashboard: Owned / Shared with me (Server Component)
│  ├─ documents/[id]/page.tsx    # loads a doc with auth check, renders the editor
│  └─ api/                       # route handlers = the backend
│     ├─ users/                  # GET seeded users
│     ├─ session/                # GET current mock user, POST to switch
│     └─ documents/
│        ├─ route.ts             # GET list, POST create
│        ├─ import/route.ts      # POST multipart upload
│        └─ [id]/
│           ├─ route.ts          # GET / PATCH / DELETE one document
│           └─ shares/…          # POST share, DELETE unshare
├─ components/                   # client components (editor, toolbar, dialogs)
└─ lib/
   ├─ prisma.ts                  # PrismaClient singleton
   ├─ auth.ts                    # getCurrentUser() from the session cookie
   ├─ documents.ts               # service layer — ALL authorization lives here
   ├─ content.ts                 # HTML sanitization, txt/md -> HTML
   ├─ validation.ts              # Zod schemas + limits
   └─ errors.ts                  # typed errors -> HTTP responses
```

## Key decisions

- **Authorization is centralized in `src/lib/documents.ts`.** Route handlers do
  auth (`getCurrentUser`) + validation (Zod) and then delegate. Every read/write
  path calls `getDocumentForUser()` (owner-or-shared) or `assertOwner()`
  (owner-only) before touching data, so the frontend cannot bypass it. This is
  also exactly what the test suite exercises — see [Testing](#testing) below.
- **Content is stored as sanitized HTML.** TipTap reads and writes HTML
  natively, and Markdown import is a one-step `marked` → sanitize. Stored HTML is
  restricted (via `sanitize-html`) to the tag set the editor can produce, so a
  `<script>` in an imported file or a crafted `PATCH` is stripped before it is
  saved.
- **Autosave** is a debounced `PATCH` (800 ms) with a "Saving… / All changes
  saved" indicator; a pending save is flushed on navigation away. Conflict
  resolution is last-write-wins (see [Tradeoffs](#tradeoffs--things-left-out-by-the-timebox)).
- **Mock auth**: the "logged-in" user is an httpOnly `userId` cookie set by
  `POST /api/session`. With no cookie the app falls back to the first seeded user
  so it is usable on first load. There are no anonymous requests — every API
  call resolves to some user.
- **Every page is dynamic** (`export const dynamic = "force-dynamic"` on the
  root layout): each page is per-user (cookie-driven) and the shell queries the
  database, so nothing is statically prerendered. This also decouples the build
  from needing a reachable database — `next build` succeeds even with no
  `DATABASE_URL` set.

## Database schema (`prisma/schema.prisma`)

```
User            id, name, email (unique), createdAt
Document        id, title, content (HTML text), ownerId -> User, createdAt, updatedAt
DocumentShare   id, documentId -> Document, userId -> User, createdAt
                @@unique([documentId, userId])   // one share row per (doc, user)
```

The datasource uses `url` (pooled, `DATABASE_URL`) + `directUrl` (unpooled,
`DATABASE_URL_UNPOOLED`, used only by `prisma migrate`) so it works behind a
serverless connection pooler like Neon's. Those variable names match what
Vercel's Neon storage integration provisions automatically.

`onDelete: Cascade` on both `DocumentShare` relations; deleting a document
removes its shares.

## API

| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/api/users` | any | seeded users |
| GET / POST | `/api/session` | any | read / switch the active mock user |
| GET | `/api/documents` | user | `{ owned: [], shared: [] }` |
| POST | `/api/documents` | user | create empty document |
| GET | `/api/documents/:id` | owner or shared | returns `role: "owner" \| "editor"` |
| PATCH | `/api/documents/:id` | owner or shared | update `title` and/or `content` |
| DELETE | `/api/documents/:id` | owner only | |
| POST | `/api/documents/:id/shares` | owner only | body `{ userId }` |
| DELETE | `/api/documents/:id/shares/:userId` | owner only | |
| POST | `/api/documents/import` | user | multipart `file`; `.txt`/`.md`, ≤ 1 MB |

Errors return `{ "error": "message" }` with `400` (validation), `401` (no user),
`403` (not authorized), `404` (missing), or `500`.

## Testing

```bash
TEST_DATABASE_URL="postgresql://…/ajaia_test" npm test
```

`tests/authorization.test.ts` runs against the Postgres database in
`TEST_DATABASE_URL` (a Neon branch or a second database works well).
`tests/global-setup.ts` rebuilds the schema from the migrations before the run,
and every row is deleted between tests. If `TEST_DATABASE_URL` is unset the
suite falls back to `DATABASE_URL` with a warning. It covers the core
requirement:

1. **Owner + shared users in, everyone else out** — Alice creates a document;
   Carol is denied (`ForbiddenError`); Alice shares with Bob; Bob is now allowed
   (as `editor`); Carol is still denied.
2. **Edit vs. manage permissions** — a shared editor can edit content; a
   non-collaborator cannot; a shared editor cannot share or delete; the owner
   can delete.
3. **Owned vs. shared listing** — `listDocumentsForUser` puts each document in
   the correct bucket.

The tests call the same `src/lib/documents.ts` functions the API routes use, so
they verify the real authorization logic and real Prisma queries, not a mock.

## Tradeoffs & things left out (by the timebox)

**Deliberately not built** (per the assignment's scope-control list): real-time
collaboration / WebSockets / CRDT, comments, version history, real auth
(passwords/OAuth/sessions), permission tiers (all shares grant edit), `.docx`
import, export, folders/search/trash, pagination, and E2E/browser tests.

**Conscious shortcuts**

- **Content as HTML, not ProseMirror JSON.** Faster import and simpler
  round-tripping; slightly less structured than JSON. Mitigated by strict
  server-side sanitization.
- **Last-write-wins autosave.** Two people editing the same document
  simultaneously can overwrite each other. Acceptable without real-time infra;
  a real fix needs OT/CRDT, which is explicitly out of scope.
- **Mock auth via a cookie with a first-user fallback.** No login screen. Fine
  for the assignment; not a real identity system.
- **All collaborators are editors.** No read-only sharing.
- **Postgres, seeded on every deploy.** `vercel-build` runs `prisma migrate
  deploy` + the (idempotent) seed so a fresh deployment is immediately usable.
  For a real app the seed would be a one-time job, not part of the build.
- **Local dev needs a Postgres URL** (Neon's free tier, or local Postgres).
  Earlier the project used SQLite for zero-setup local dev, but SQLite cannot
  persist on Vercel's serverless filesystem, so Postgres is now used everywhere
  for parity between dev, test, and prod.
- **`getCurrentUser` fallback** means an unauthenticated API call is treated as
  the first seeded user rather than rejected. The authorization *rules* (which
  document a given user may touch) are still fully enforced and tested.
- Editor autosave verified via API round-trips and a headless render of the
  editor; not wired to a full browser E2E test.
