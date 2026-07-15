# Pluto — Progress Log

## Session 1 — 2026-07-12

**Done:**
- Scaffolded Next.js 16 project with TypeScript + Tailwind (App Router, no src/ dir)
- Confirmed dev server runs on Android/Termux using `--webpack` flag (Turbopack unsupported on arm64)
- Created `components/`, `lib/`, `types/` folders with `.gitkeep` placeholders
- Added `.env.local.example` documenting required env vars (Supabase URL/keys, Gemini API key)
- Confirmed `.env.local` is gitignored
- Replaced default homepage with "Pluto — Coming soon" placeholder
- Updated page metadata title to "Pluto"
- Committed and pushed initial scaffold to GitHub

**Gotchas:**
- Next.js 16 defaults to Turbopack for `next dev`; must always run with `--webpack` flag on this device. `package.json` dev script is set to `"dev": "next dev --webpack"` — don't remove this.
- Working across 3 Termux sessions: one running the dev server, one for Claude Code, one for git/commands. Keep them straight to avoid running git commands in the server session (or killing the server accidentally).

**Next up:**
- Card 2: Connect Supabase — install `@supabase/supabase-js`, set up client in `lib/`, wire real env vars into `.env.local` (not committed)

## Session 2 — 2026-07-12

**Done:**
- Installed `@supabase/supabase-js`
- Retrieved Supabase project URL + anon key from dashboard, added to `.env.local` (not committed)
- Created `lib/supabase/client.ts` — browser-side Supabase client
- Smoke-tested the connection via console.log on homepage — confirmed "Supabase client initialized: yes" in server terminal
- Removed test code, committed clean

**Gotchas:**
- None this session — connection worked on first try.

**Next up:**
- Card 3: Build auth (sign up / log in / log out) using Supabase Auth
- Will need a server-side Supabase client too (different setup than the browser client) once we add server components/route handlers for auth

## Session 3 — 2026-07-12

**Done:**
- Installed `@supabase/ssr`, created `lib/supabase/server.ts` for server-side auth (cookie-based)
- Built `/signup` page — email + password sign up via Supabase Auth
- Built `/login` page — email + password log in
- Updated homepage to check auth state, show logged-in user's email + log out button, or placeholder if logged out
- Disabled "Confirm email" in Supabase dashboard (Authentication → Providers → Email) for instant demo sign-up flow
- Tested full loop: sign up → auto-login → homepage shows logged in state → log out → back to placeholder — all working

**Gotchas:**
- `/login` initially 404'd — turned out to be a saving mix-up in Acode (edited the wrong file), not an actual bug. Worth double-checking which file is open before pasting when juggling multiple similar pages.
- Sign-up and log-in pages are near-duplicates right now (same form, different Supabase call). Left as-is for now — could extract a shared component later if it becomes annoying to maintain, but not worth it yet for two pages.

**Next up:**
- Card 4: Design DB schema — conversations and messages tables in Supabase, likely with a foreign key to Supabase's built-in auth.users table

## Session 4 — 2026-07-12

**Done:**
- Designed DB schema: `conversations` (id, user_id, title, timestamps) and `messages` (id, conversation_id, role, content, created_at)
- Enabled Row Level Security (RLS) on both tables, scoped to `auth.uid()` so users can only access their own data
- Added indexes on `user_id` and `conversation_id` for common query patterns
- Created `supabase/schema.sql` to track the schema in version control (source of truth going forward, not just Supabase's dashboard)
- Committed and pushed

**Gotchas:**
- First attempt to create `conversations` failed — table already existed in Supabase (unclear why, possibly leftover from initial project setup). Investigated further and found `public.messages` also already existed, but with a completely different structure — turned out to be unrelated to Supabase's internal `realtime.messages` table, just a coincidentally-named leftover table in the public schema.
- Confirmed via `information_schema.tables` (checking `table_schema`) before deciding it was safe to drop and recreate cleanly — no data existed yet, so low risk, but worth verifying schema/ownership before dropping anything in a real project.

**Next up:**
- Card 5: Build chat UI shell (layout, sidebar, input box)
- Route protection (deferred from Card 3) should be added once this page exists, since it'll be the first page that actually needs to be gated behind login

## Session 5 — 2026-07-12

**Done:**
- Added `proxy.ts` (renamed from `middleware.ts` — Next.js 16 convention change) to protect `/chat` routes, redirecting logged-out users to `/login`
- Built `/chat` page shell: sidebar (conversation list placeholder), message display area, input box — UI only, not yet wired to Gemini or Supabase
- Fixed a session/cookie mismatch bug (see gotcha below)
- Verified full flow: logged-out → redirected from `/chat` to `/login`; logged-in → `/chat` shows shell UI correctly

**Gotchas:**
- Next.js 16 deprecated `middleware.ts` in favor of `proxy.ts` (renamed file + renamed exported function). Initial rename alone didn't fix the actual bug below, so don't assume a rename = working.
- Bigger issue: after renaming, `/chat` kept redirecting to `/login` even when logged in. Root cause: the browser-side Supabase client (`lib/supabase/client.ts`) was using plain `createClient` from `@supabase/supabase-js`, which stores sessions in **localStorage**. The server-side proxy client uses `@supabase/ssr`, which only reads sessions from **cookies**. The two were completely disconnected — login "worked" (real localStorage session existed) but the proxy could never see it.
- Fix: switched the browser client to `createBrowserClient` from `@supabase/ssr` too, so both browser and server read/write the same cookie-based session. Debugged via console.log statements in `proxy.ts` showing the auth cookie was present but `getUser()` still returned null — confirmed via research that this is a known gotcha when mixing plain `supabase-js` with `@supabase/ssr` in the same app.
- Takeaway: when using `@supabase/ssr` anywhere in a Next.js app (for proxy/middleware or server components), use it everywhere — including the browser client — rather than mixing it with plain `supabase-js`.

**Next up:**
- Card 6: Wire up Gemini API with streaming — this is the core feature, will take the input box from decorative to functional

## Environment change — post-Session 5

Development moved from the original Android/Termux setup (Claude Code via OpenRouter's free tier) to Ubuntu, with Claude Code set up directly through Anthropic's own API. Sessions 1–5 above happened under the old Termux setup and are left unedited as an accurate record; all Termux-specific gotchas (the `--webpack` flag, the "3 Termux sessions" workflow) applied to that environment and should be re-evaluated (not assumed) now that dev has moved to Ubuntu. Going forward, progress entries should reflect the Ubuntu/Anthropic-API environment.
