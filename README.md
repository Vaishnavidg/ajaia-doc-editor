# Ajaia Docs

Hosted link: https://ajaia-doc-editor-hoe3okl7o-vaishnavidgs-projects.vercel.app/documents

A lightweight collaborative document editor inspired by Google Docs. Create,
format, import, and share rich-text documents with backend-enforced
authorization.

Built for the Ajaia Full Stack Product Engineer take-home (timeboxed to 4–6
hours — the goal is a reliable MVP, not feature completeness).

**Live:** https://ajaia-doc-editor-smoky.vercel.app

See also: [ARCHITECTURE.md](ARCHITECTURE.md) (design, schema, API, tradeoffs)
and [AI_WORKFLOW.md](AI_WORKFLOW.md) (how AI was used and verified).

---

## Features

| Area | What works |
|---|---|
| Documents | Create, rename, edit, autosave, reopen; persisted in Postgres |
| Rich text | Bold, italic, underline, H1–H3, bullet & numbered lists (TipTap) |
| File import | `.txt` and `.md`, converted to an editable document; type + size validated on the client **and** the server; supported types shown in the dialog |
| Sharing | Seeded/mock users, an owner per document, share/unshare with another user, separate **Owned** and **Shared with me** lists |
| Authorization | Every document API call is checked on the backend: access requires `user == owner` **or** a `DocumentShare` row. Only the owner can share, unshare, or delete. |
| Errors | Zod validation on every request body; consistent JSON error shape; friendly messages surfaced in the UI |
| Tests | Vitest suite covering the sharing/authorization rules against a real Postgres database |

---

## Tech stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript** — one app, one
  deploy; API route handlers are the backend.
- **TipTap 2** (`StarterKit` + `Underline`) — rich-text editing.
- **Prisma 6** + **PostgreSQL** — schema, migrations, typed queries. Any Postgres
  works; [Neon](https://neon.tech) / Vercel Postgres are the zero-setup options.
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
npm install        # also runs `prisma generate`

# 3. Point at a Postgres database
cp .env.example .env
#   Edit .env: set DATABASE_URL and DATABASE_URL_UNPOOLED to your Postgres
#   connection strings. Fastest path: create a free project at neon.tech and
#   paste its pooled URL into DATABASE_URL and its direct URL into
#   DATABASE_URL_UNPOOLED.

# 4. Create the schema + seed the mock users
npm run db:migrate            # prisma migrate dev
npm run db:seed               # 4 mock users + a sample shared document

# 5. Run
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
npm test           # Vitest suite. Needs a throwaway Postgres:
                   #   TEST_DATABASE_URL=postgres://... npm test
                   #   (falls back to DATABASE_URL with a warning — every row
                   #    in that DB is deleted between tests)
npm run build      # production build (runs `prisma generate` first)
npm run start      # serve the production build
npm run lint       # eslint
npm run db:reset   # drop + re-migrate + re-seed the dev database
```

---

## Deployment (Vercel)

This is a single Next.js app — the API route handlers are the backend, served
from the same origin as the pages. There is no separate service, so no CORS
config, no API-base-URL variable, and no cross-service networking. The only
external dependency is a Postgres database.

**Architecture:** Vercel (Next.js app + serverless API routes) → Postgres (Neon /
Vercel Postgres).

### Steps

1. **Push this repo to GitHub** (or GitLab/Bitbucket).

2. **Import the project** in Vercel → **Add New… → Project** → pick the repo.
   Root directory is `./` (this is not a monorepo). Framework preset **Next.js**
   is detected; leave the build settings default (the repo's `vercel-build`
   script is used automatically). Deploy once — it will fail at the database
   step, that's expected before step 3.

3. **Create and connect Postgres.** Vercel dashboard → **Storage** tab →
   **Create Database → Postgres (Neon)** (or connect an existing Neon project)
   → **Connect to Project** → select this project → leave **Custom
   Environment Variable Prefix empty** (that's what makes it create plain
   `DATABASE_URL` / `DATABASE_URL_UNPOOLED` — the names
   `prisma/schema.prisma` expects) → **Connect Project**. This creates ~18
   environment variables automatically; no manual copy-pasting of connection
   strings needed, which avoids the usual sources of a broken connection
   string (stray quotes, wrong field, truncated paste).

4. **Redeploy** (Deployments tab → latest → ⋯ → Redeploy, or push a new
   commit). `vercel-build` now runs:

   ```
   prisma generate && prisma migrate deploy && node prisma/seed.mjs && next build
   ```

   migrating the schema and (idempotently) seeding the four mock users before
   the app is built. No manual database step is needed after this.

5. Open the deployment URL, pick a user from **Viewing as**, and use the app.

### Notes

- **Migrations** live in `prisma/migrations/` and are applied by
  `prisma migrate deploy` during the build — never `db push` in production.
- **Node**: `package.json` `engines` pins Node ≥ 20.19 / ≥ 22.12; Vercel honors
  it (or set the Node version in Project Settings).
- **Rollback**: redeploying an older commit re-runs `migrate deploy`, which only
  applies *forward* migrations. Down-migrations are not automated (out of scope).
- **One Vercel project per GitHub repo.** If you import the repo twice you get
  two projects both building on every push, each with its own env vars — pick
  one and delete the other, or you'll edit variables on the wrong project.
