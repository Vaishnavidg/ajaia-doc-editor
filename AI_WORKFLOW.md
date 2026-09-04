# AI-native workflow

**Tool used:** Claude Code (Claude Sonnet) — as an implementation assistant,
not the decision-maker. Every architectural choice (stack, database, deploy
target) was made or approved by the developer before implementation; AI wrote
code, ran it, read the output, and reported back rather than asserting success.

---

## Where AI helped

- **Scaffolding and boilerplate**: Next.js setup, Prisma schema, route-handler
  skeletons, Tailwind markup for the dialogs and dashboard, the Vercel/Postgres
  deployment wiring (`vercel-build` script, `.env.example`).
- **The service/validation/error-handling layer** (`src/lib/documents.ts`,
  `validation.ts`, `errors.ts`) and the Vitest authorization suite were drafted
  with AI and then reviewed line by line against the CLAUDE.md authorization
  rule (`user == owner OR DocumentShare`).
- **Debugging environment friction**: Node version vs. Prisma 6/7 compatibility,
  npm peer-dependency conflicts, and dependency selection.
- **Live deployment debugging**: reading Vercel build logs, diagnosing Prisma
  connection-string errors, and — once given a scoped access token — inspecting
  and fixing the actual Vercel project configuration via the CLI.

## What was changed or rejected

- **Prisma 7 → Prisma 6.** `prisma init` for v7 generated a `prisma.config.ts`,
  a custom client output path, non-auto env loading, and unrelated "skills"
  files. Downgraded to the stable Prisma 6 for less moving-parts risk within the
  timebox.
- **SQLite → Postgres.** The project first used SQLite (per an explicit
  request) with a Fly.io + Docker deployment. When the target became Vercel,
  SQLite was dropped — it can't persist on serverless — in favor of Postgres
  everywhere, and the Docker/Fly files were removed rather than left as dead
  weight.
- **`DIRECT_URL` → `DATABASE_URL_UNPOOLED`.** The schema originally expected a
  variable named `DIRECT_URL`, matching generic Prisma docs. Once the project
  was connected to Vercel's Neon storage integration (which provisions
  `DATABASE_URL` / `DATABASE_URL_UNPOOLED` automatically, not `DIRECT_URL`),
  the schema was changed to match the integration's actual output rather than
  asking the user to hand-add a differently-named duplicate variable — fewer
  manually-entered secrets, fewer chances to mistype one.
- The test DB setup went through three iterations: `db push --force-reset`
  (destructive flag removed after Prisma's own safety prompt flagged it) →
  delete-and-recreate the SQLite file → finally `prisma db execute --url`
  against a throwaway Postgres database, which sidesteps a real `.env`
  precedence bug found in the test runner (below).
- Tightened a few AI-generated validation messages that leaked internals
  ("Max 976.5625 KB" → "Maximum is 1 MB").

## Bugs found and fixed through verification (not assumed away)

These were each caught by actually running the app / build / tests, not by
inspection alone:

- **Client Router Cache serving stale data.** Newly created documents didn't
  appear on the dashboard after navigating back from the editor; the "Viewing
  as" switcher showed the previous user for one navigation after switching.
  Root cause: Next.js's client-side router cache. Fixed with local component
  state for immediate UI feedback plus `router.refresh()` / a hard navigation
  at the right points — verified with a scripted headless-Chromium walkthrough
  (switch user → create → navigate back → assert the new document is visible),
  not just re-reading the code.
- **A stale service worker** from an unrelated earlier project on the same
  `localhost:3000` was caching pages, so normal reloads showed old content and
  only a hard refresh worked. Diagnosed from `GET /sw.js 404` noise in the dev
  server log; fixed with an unregister-and-reload script in the root layout.
- **`tests/global-setup.ts` env-var precedence.** Vitest 5 auto-injects `.env`
  into `process.env` for the test run. A naive
  `directUrl = process.env.DIRECT_URL || url` fallback silently preferred a
  placeholder value committed to `.env` over the real `TEST_DATABASE_URL` the
  developer had exported — tests failed with "Can't reach database server at
  `HOST:5432`" even though the right URL was set. Found by adding temporary
  debug logging inside the test runner itself, not by staring at the code;
  fixed by resolving the pooled/direct URLs together instead of independently
  falling back.
- **`next build` querying the database at build time.** `/_not-found` is
  statically prerendered by default, and the root layout's `<TopBar/>` queried
  Postgres for the user list — so a build with no reachable database failed.
  Fixed by making the whole app explicitly dynamic and making `TopBar`
  tolerate a failed query, then re-verified the build with zero `DATABASE_URL`
  set.
- **A build that silently deployed the wrong commit.** Vercel's dashboard
  "Redeploy" action rebuilds a deployment's *original* commit, not the branch
  tip — so a `git push` with the actual fix didn't show up. Confirmed by
  comparing the commit hash in the build log against `git log`, not by
  assuming the redeploy picked up the latest code.

## Credential handling

At the developer's request, AI was given a scoped Vercel access token to
inspect and fix the live deployment directly (after earlier attempts to
diagnose it blind, from pasted build logs alone, stalled). Handling of that
credential:

- Instructed to save it to a file outside the project directory
  (`/tmp/vercel_token.txt`), not paste it in chat — caught once when it landed
  inside the repo instead (`ajaia-doc-editor/tmp/...`) and was relocated before
  use, since that path was untracked but not gitignored and a later `git add
  -A` could have committed it.
- Verified against Vercel's live API (`GET /v2/user`) before any use, rather
  than trusting the CLI's cached state — this caught three rounds of the
  *same* invalid token being resubmitted (confirmed by comparing SHA-256
  hashes) before a genuinely new one worked.
- Deleted (`shred -u`) immediately after use, both after failed attempts and
  after the successful deployment.
- Never echoed the token value in any command output.

## How correctness and UX were verified

- `npm test` — authorization rules, run against a real Postgres database
  (green).
- `npm run build` + `npm run lint` + `tsc --noEmit` — clean, including a
  simulated exact `vercel-build` run (`prisma generate && prisma migrate
  deploy && node prisma/seed.mjs && next build`) against a freshly created,
  empty database to confirm the deployment pipeline itself works end to end,
  not just the app code.
- Manual API smoke tests with `curl` against the dev server, the local
  production build, **and the live Vercel deployment**: create → edit →
  reopen (persistence), Carol `403`, Bob `403` before share → `200` after, Bob
  cannot share/delete, `<script>` stripped on save, `.md`/`.txt` import,
  oversize and wrong-type import rejected, Owned vs. Shared listing, and the
  session cookie carrying `Secure; HttpOnly; SameSite=lax` in production.
- Headless-Chromium screenshots and a scripted CDP walkthrough of the dashboard
  and editor to confirm TipTap actually hydrates and renders imported Markdown
  (heading, bold, italic, bullet and numbered lists), and that the user-switch
  and new-document-visibility bugs above were actually fixed, not just
  plausibly fixed.
