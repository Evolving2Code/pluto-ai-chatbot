# Pluto — Key Decisions

### Why Gemini API over OpenAI/Anthropic API
Chose Google AI Studio's Gemini API for the chatbot model because it has a genuinely permanent free tier with no credit card required — important for a portfolio project that needs to keep running indefinitely without ongoing cost.

### Why Supabase over Firebase/custom backend
Supabase gives Postgres + auth in one package, with a generous free tier and a real SQL database (better portfolio talking point than a NoSQL doc store, and more transferable skill).

### Why Next.js App Router (not Pages Router)
App Router is the current recommended approach for new Next.js projects and better demonstrates familiarity with modern React patterns (Server Components, streaming, etc.) to prospective employers.

### Why --webpack flag instead of Turbopack
Turbopack (Next.js 16's default dev bundler) was not yet supported on Android/arm64 under Termux, which was the original dev environment. This constraint no longer applies now that development has moved to Ubuntu — the `--webpack` flag can likely be removed and Turbopack re-tested, but this hasn't been re-verified yet.

### Dev environment: Ubuntu with Claude Code via Anthropic's API
Development moved from an initial Android/Termux setup (using Claude Code routed through OpenRouter's free tier) to Ubuntu, using Claude Code set up directly via Anthropic's own API. The Termux/OpenRouter/Gemini-agent setup was an early experiment and is no longer in use — all current and future work happens in the Ubuntu environment.

### Route protection deferred to Card 5
Auth (sign up/log in/log out) is built and working, but no middleware/route protection yet — there's nothing to protect until the chat UI (Card 5) exists. Will add protection when that page is built, rather than protecting routes preemptively.
