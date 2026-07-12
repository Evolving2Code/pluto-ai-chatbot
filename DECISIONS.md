# Pluto — Key Decisions

### Why Gemini API over OpenAI/Anthropic API
Chose Google AI Studio's Gemini API for the chatbot model because it has a genuinely permanent free tier with no credit card required — important for a portfolio project that needs to keep running indefinitely without ongoing cost.

### Why Supabase over Firebase/custom backend
Supabase gives Postgres + auth in one package, with a generous free tier and a real SQL database (better portfolio talking point than a NoSQL doc store, and more transferable skill).

### Why Next.js App Router (not Pages Router)
App Router is the current recommended approach for new Next.js projects and better demonstrates familiarity with modern React patterns (Server Components, streaming, etc.) to prospective employers.

### Why --webpack flag instead of Turbopack
Turbopack (Next.js 16's default dev bundler) is not yet supported on Android/arm64 under Termux. Using `--webpack` explicitly keeps local dev working; this is a dev-environment constraint only and doesn't affect the production build/deploy on Vercel.

### Dev environment: Termux on Android
Chose to build entirely on an Android phone via Termux + Claude Code (routed through OpenRouter free tier) as a constraint/challenge and to keep the project genuinely zero-cost during development. Doubles as a good interview story about working within constraints.