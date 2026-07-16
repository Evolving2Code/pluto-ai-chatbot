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

## Session 6 — 2026-07-13

**Done:**
- Installed `@google/genai` (confirmed current package via search — older `@google/generative-ai` is deprecated)
- Added `GEMINI_API_KEY` to `.env.local` (server-only, no `NEXT_PUBLIC_` prefix)
- Built `/api/chat` route: streams responses from Gemini (`gemini-2.5-flash`)
- Updated `/chat` page to send messages and render streamed responses in real time
- Found and fixed a dark mode bug: hardcoded Tailwind colors caused washed-out/low-contrast bubbles on dark-mode devices
- Added proper dark mode using Tailwind 4's built-in `dark:` variant (auto via `prefers-color-scheme`, no config needed)
- Applied dark mode manually to `/chat`, then had Claude Code replicate the pattern on `/login`, `/signup`, and homepage — reviewed diffs before accepting, all clean
- Verified all four pages (`/`, `/login`, `/signup`, `/chat`) look consistent and correctly styled in dark mode

**Gotchas:**
- Dark mode bug was subtle — bubbles looked "faded" rather than obviously broken, due to Chrome's forced-dark-mode color-inversion partially affecting unstyled elements. Confirmed by testing in light mode first.
- Tailwind 4 is CSS-first — no `tailwind.config.js`, no `darkMode: 'class'` setting needed. `dark:` works automatically out of the box.
- Two different Supabase project ref cookies seen in proxy logs earlier — likely stale from prior testing, not yet cleaned up. Not currently breaking anything.

**Next up:**
- Card 7: Persist messages to Supabase (currently messages live only in React state, vanish on refresh)
- Clean up stale duplicate Supabase cookie at some point

## Session 7 — 2026-07-13

**Done:**
- Added auth check to `/api/chat` (previously unprotected — now requires a logged-in session)
- `/api/chat` now creates a `conversations` row on first message, saves both user and assistant messages to `messages`
- Conversation ID passed back to client via a stream marker so follow-up messages in the same session attach correctly
- Added `GET /api/conversations` — lists the logged-in user's conversations (RLS handles scoping automatically, no manual `user_id` filter needed)
- Added `GET /api/conversations/[id]/messages` — fetches messages for a specific conversation
- Updated `/chat` page: loads conversation list into sidebar on mount, clicking a conversation loads its message history, "+ New conversation" clears the view for a fresh chat
- Verified full loop: send message → creates conversation + saves messages → appears in sidebar → click to reload → new conversation button works

**Gotchas:**
- Had a paste mishap where new `handleSubmit` code was pasted into the middle of the old file instead of replacing it, creating duplicate `'use client'`, duplicate imports, and two `return` statements. Fixed by deleting and recreating the file from scratch rather than patching the mess. Lesson: for full-file replacements, safest approach is `rm` then `nano` fresh, rather than trying to select-all in an editor.

**Next up:**
- Card 8: Error handling & loading states (API failures, empty responses, network errors — currently no try/catch anywhere in the chat flow)
- Still pending: clean up stale duplicate Supabase cookie noticed in proxy logs a couple sessions back

## Session 8 — 2026-07-13

**Done:**
- Added comprehensive error handling to `/api/chat`: validates input, catches DB errors, catches Gemini API failures, handles mid-stream interruptions — each returns an appropriate status code and message instead of crashing or hanging
- Added try/catch/finally to the frontend chat submit flow — `finally` guarantees the loading spinner always resolves, even on failure (previously flagged as a risk in the original codebase review)
- Added a visible error banner in the UI for failed requests
- Failed message attempts now remove the empty assistant placeholder bubble instead of leaving it blank
- Tested via deliberately breaking `GEMINI_API_KEY` — confirmed clean failure path end to end, and full recovery once the key was restored

**Also this session:**
- Discussed deployment timing — decided to keep deploying as the final step (Card 10), but expanded scope: goal is now to make Pluto feel genuinely polished/production-grade (closer to major chatbot apps), not just "done." Added 15 new backlog cards covering markdown rendering, auto-scroll, keyboard shortcuts, mobile responsiveness, conversation rename/delete, multi-turn context, regenerate/stop generation, and visual polish.

**Next up:**
- Card 9: Polish UI/UX pass — likely start pulling from the new 15-card polish backlog rather than a single generic pass
- Still pending: multi-turn context fix (Card 12 on new backlog) — currently each message has no memory of the conversation, a real functional gap worth prioritizing relatively soon

## Session 9 — 2026-07-15

**Done:**
- Fixed multi-turn conversation context: `/api/chat` now loads the full message history for a conversation from Supabase and sends it to Gemini as context, instead of just the latest message. Maps `assistant` role to Gemini's expected `model` role.
- Found and fixed a related bug during testing: clicking into an existing conversation from the sidebar and immediately sending a follow-up message could leak the raw `__CONVERSATION_ID__..._END__` stream marker into the displayed message. Root cause was a stale-state race condition — `conversationId` read from React state could lag behind the actual current value at the moment of submission.
- Fixed by introducing `conversationIdRef` (a `useRef`) alongside the existing state, so `handleSubmit` always reads the current value synchronously rather than depending on render timing.
- Verified: multi-turn memory works correctly (Gemini recalls info from earlier in the same conversation), and no marker leakage on rapid conversation-switch-then-send scenarios.

**Gotchas:**
- Good reminder that `useState` values inside closures (like `handleSubmit`) can be stale if read immediately after a state update from a different function — `useRef` is the standard fix when a value needs to be read synchronously regardless of render timing.

**Next up:**
- Card 9 (original backlog): Polish UI/UX pass — likely start pulling from the expanded 15-card polish backlog
- Good candidates to start with: markdown rendering (users are already sending code-adjacent questions), auto-scroll, Enter-to-send

## Session 10 — 2026-07-15

**Done:**
- Added markdown rendering for assistant messages via `react-markdown`, with syntax-highlighted code blocks via `react-syntax-highlighter` and Tailwind's typography plugin for prose styling
- Fixed a mobile viewport bug causing the page to load misaligned/zoomed until manually pinch-zoomed — root cause was a missing `viewport` meta export in `layout.tsx`
- Built a proper mobile-responsive sidebar: hidden by default on mobile with a hamburger toggle, permanently visible on desktop (`md:` breakpoint) — matches patterns from major chat apps (Claude, ChatGPT, etc.)
- Fixed a second mobile viewport bug: `h-screen` (100vh) doesn't account for the mobile browser address bar, pushing the top bar and input box below the visible fold until scrolling. Fixed by switching to `h-dvh` (dynamic viewport height), a Tailwind-native fix requiring no config changes.
- Changed Enter/Shift+Enter behavior to match preferred chatbot convention: Enter inserts a newline, Shift+Enter sends
- Fixed a recurring bug where the internal `__CONVERSATION_ID__..._END__` stream marker leaked into displayed messages. Root cause: marker-stripping logic on the client only ran when a message was the "first" in a conversation, but the server actually sends the marker on every single message — fixed by always checking for and stripping it, regardless of conversation state

**Gotchas:**
- Two separate "same symptom, different cause" bugs this session (marker leak twice, for different underlying reasons) — good reminder that visually identical bugs aren't always the same root cause; each needs its own actual diagnosis rather than assuming the earlier fix should have covered it
- Mobile viewport quirks (100vh vs 100dvh, missing viewport meta tag) are common and easy to miss when developing primarily by eyeballing localhost on the same device without testing viewport-sensitive scenarios like page load state or address-bar visibility changes

**Next up:**
- Continue polish backlog: auto-generated conversation titles, conversation rename/delete, copy button on messages, regenerate/stop generation
- Still pending: stale duplicate Supabase cookie cleanup (minor, non-blocking)