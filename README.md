# Ajaia Docs

A lightweight collaborative document editor inspired by Google Docs. Create,
format, import, and share rich-text documents with backend-enforced
authorization.

Built for the Ajaia Full Stack Product Engineer take-home (timeboxed to 4–6
hours — the goal is a reliable MVP, not feature completeness).

---

## Features

| Area | What works |
|---|---|
| Documents | Create, rename, edit, autosave, reopen; persisted in SQLite |
| Rich text | Bold, italic, underline, H1–H3, bullet & numbered lists (TipTap) |
| File import | `.txt` and `.md`, converted to an editable document; type + size validated on the client **and** the server; supported types shown in the dialog |
| Sharing | Seeded/mock users, an owner per document, share/unshare with another user, separate **Owned** and **Shared with me** lists |
| Authorization | Every document API call is checked on the backend: access requires `user == owner` **or** a `DocumentShare` row. Only the owner can share, unshare, or delete. |
| Errors | Zod validation on every request body; consistent JSON error shape; friendly messages surfaced in the UI |
| Tests | Vitest suite covering the sharing/authorization rules against a real SQLite database |

---

## Tech stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript** — one app, one
  deploy; API route handlers are the backend.
- **TipTap 2** (`StarterKit` + `Underline`) — rich-text editing.
- **Prisma 6** + **SQLite** — schema, migrations, and a single-file database.
- **Tailwind CSS 4** — styling.
- **Zod** — request validation.
- **sanitize-html** + **marked** — safe HTML storage and Markdown import.
- **Vitest** — tests.

Node **>= 22.12** (or >= 20.19) is required by Prisma 6. See `.nvmrc`.

---

## Getting started

```bash
# 1. Use the right Node version
nvm use            # reads .nvmrc (22.13.1); or install Node >= 22.12

# 2. Install
npm install

# 3. Set up the database
cp .env.example .env          # DATABASE_URL="file:./dev.db"
npm run db:migrate            # apply migrations
npm run db:seed               # seed 4 mock users + a sample shared document

# 4. Run
npm run dev                   # http://localhost:3000
```

Seeded users (switch between them with the **Viewing as** dropdown in the top
bar):

| Name | Email | Role in the seed data |
|---|---|---|
| Alice Owner | alice@example.com | owns "Welcome to Ajaia Docs" |
| Bob Editor | bob@example.com | that document is shared with Bob |
| Carol Outsider | carol@example.com | no access to it |
| Dave Reader | dave@example.com | — |

### Other scripts

```bash
npm test           # run the Vitest suite (uses an isolated prisma/test.db)
npm run build      # production build (runs `prisma generate` first)
npm run start      # serve the production build
npm run lint       # eslint
npm run db:reset   # drop + re-migrate + re-seed the dev database
```

---

## Architecture

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

**Key decisions**

- **Authorization is centralized in `src/lib/documents.ts`.** Route handlers do
  auth (`getCurrentUser`) + validation (Zod) and then delegate. Every read/write
  path calls `getDocumentForUser()` (owner-or-shared) or `assertOwner()`
  (owner-only) before touching data, so the frontend cannot bypass it. This is
  also exactly what the test suite exercises.
- **Content is stored as sanitized HTML.** TipTap reads and writes HTML
  natively, and Markdown import is a one-step `marked` → sanitize. Stored HTML is
  restricted (via `sanitize-html`) to the tag set the editor can produce, so a
  `<script>` in an imported file or a crafted `PATCH` is stripped before it is
  saved.
- **Autosave** is a debounced `PATCH` (800 ms) with a "Saving… / All changes
  saved" indicator; a pending save is flushed on navigation away. Conflict
  resolution is last-write-wins (see tradeoffs).
- **Mock auth**: the "logged-in" user is an httpOnly `userId` cookie set by
  `POST /api/session`. With no cookie the app falls back to the first seeded user
  so it is usable on first load. There are no anonymous requests — every API
  call resolves to some user.

### Database schema (`prisma/schema.prisma`)

```
User            id, name, email (unique), createdAt
Document        id, title, content (HTML), ownerId -> User, createdAt, updatedAt
DocumentShare   id, documentId -> Document, userId -> User, createdAt
                @@unique([documentId, userId])   // one share row per (doc, user)
```

`onDelete: Cascade` on both `DocumentShare` relations; deleting a document
removes its shares.

### API

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

---

## Testing

```bash
npm test
```

`tests/authorization.test.ts` runs against an isolated `prisma/test.db`
(created by `tests/global-setup.ts`) and covers the core requirement:

1. **Owner + shared users in, everyone else out** — Alice creates a document;
   Carol is denied (`ForbiddenError`); Alice shares with Bob; Bob is now allowed
   (as `editor`); Carol is still denied.
2. **Edit vs. manage permissions** — a shared editor can edit content; a
   non-collaborator cannot; a shared editor cannot share or delete; the owner
   can delete.
3. **Owned vs. shared listing** — `listDocumentsForUser` puts each document in
   the correct bucket.

The tests call the same `src/lib/documents.ts` functions the API routes use, so
they verify the real authorization logic and real Prisma queries.

---

## Deployment

The app is packaged as a Docker image (`Dockerfile`) that runs `prisma migrate
deploy` and seeds mock users on boot, then serves the Next.js production build.
SQLite lives on a mounted volume at `/data/prod.db`.

### Fly.io (config included)

```bash
fly launch --no-deploy                              # accept the bundled fly.toml
fly volumes create data --size 1 --region iad       # persistent disk for SQLite
fly deploy
```

`fly.toml` sets `DATABASE_URL=file:/data/prod.db` and keeps a single machine
(SQLite + one volume = one writer).

### Any Docker host

```bash
docker build -t ajaia-docs .
docker run -p 3000:3000 -v ajaia_data:/data ajaia-docs
```

> Note: the Docker image was authored but not built in the development
> environment (no Docker daemon access there). The local `npm` flow above is
> fully verified.

---

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
- **SQLite.** Zero-config and perfect for this scope; single-writer, so it does
  not scale horizontally. The Prisma schema would move to Postgres with a
  provider change and a re-migrate.
- **`getCurrentUser` fallback** means an unauthenticated API call is treated as
  the first seeded user rather than rejected. The authorization *rules* (which
  document a given user may touch) are still fully enforced and tested.
- Editor autosave verified via API round-trips and a headless render of the
  editor; not wired to a full browser E2E test.

---

## AI-native workflow

**Tool used:** Claude Code (Claude Sonnet) — as an implementation assistant, not
the decision-maker.

**Where AI helped**

- Scaffolding and boilerplate: Next.js setup, Prisma schema, route-handler
  skeletons, Tailwind markup for the dialogs and dashboard, the Dockerfile and
  `fly.toml`.
- The service/validation/error-handling layer and the Vitest authorization
  suite were drafted with AI and then reviewed line by line.
- Debugging environment friction (Node version vs. Prisma 7, npm peer-dependency
  conflicts) and dependency selection.

**What was changed or rejected**

- **Prisma 7 → Prisma 6.** `prisma init` for v7 generated a `prisma.config.ts`,
  a custom client output path, non-auto env loading, and unrelated "skills"
  files. Downgraded to the stable Prisma 6 for less moving-parts risk within the
  timebox.
- **Postgres/Vercel → SQLite/Fly.io** per the requested stack; the Docker image
  was simplified from a minimal `standalone` copy (which broke Prisma client
  resolution) to copying `node_modules` wholesale — less clever, actually works.
- The test DB setup initially used `prisma db push --force-reset`; removed the
  destructive flag (delete-file-then-push is enough and safer).
- Tightened a few AI-generated validation messages that leaked internals
  ("Max 976.5625 KB" → "Maximum is 1 MB").

**How correctness and UX were verified**

- `npm test` — authorization rules (green).
- `npm run build` + `npm run lint` — clean.
- Manual API smoke tests with `curl` against both the dev server and the
  production build: create → edit → reopen (persistence), Carol `403`, Bob `403`
  before share → `200` after, Bob cannot share/delete, `<script>` stripped on
  save, `.md`/`.txt` import, oversize and wrong-type import rejected, Owned vs
  Shared listing.
- Headless-Chromium screenshots of the dashboard and the editor to confirm
  TipTap hydrates and renders imported Markdown (heading, bold, italic, bullet
  and numbered lists).
