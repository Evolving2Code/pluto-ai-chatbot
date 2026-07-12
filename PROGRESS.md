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