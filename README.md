# CareBook — Clinical Appointment Scheduler

A Claude-powered appointment scheduling agent for Dwarka Clinic — chat UI,
staff dashboard, patient management. Built as a single Next.js 14 app on
Vercel + Supabase (ported from an earlier Replit/Express/Drizzle prototype
to fit a standard Vercel deployment).

## Stack

- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Anthropic SDK (`claude-sonnet-4-6`) with an agentic tool-use loop, streamed via SSE
- Supabase (Postgres) for patients, appointments, conversations
- Twilio for SMS confirmations (falls back to a console-log stub if unset)
- Deploys to Vercel, `bom1` (Mumbai) region

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
```

Runs at http://localhost:3000.

## Supabase setup

1. Create a Supabase project.
2. In the SQL editor, run `supabase/schema.sql`.
3. Copy the project URL, anon key, and **service role key** into
   `.env.local` / Vercel env vars. The service role key is used
   server-side only (in `lib/supabase.ts`) — never expose it to the client.

## Deploy to Vercel

```bash
npm i -g vercel
vercel login
vercel link
vercel env add ANTHROPIC_API_KEY
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
# optional: TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER
vercel --prod
```

`vercel.json` pins the deployment to the `bom1` (Mumbai) region and gives
`/api/chat` a 60s max duration for the tool-use loop. Alternatively, connect
the GitHub repo directly in the Vercel dashboard for auto-deploys on push.

## Push to GitHub

```bash
cd carebook
git init
git add .
git commit -m "Initial commit: CareBook clinic scheduler"
git branch -M main
git remote add origin https://github.com/<your-username>/carebook.git
git push -u origin main
```

Then in Vercel: **New Project → Import Git Repository** → select the repo →
add the env vars above → Deploy.

## Where things live

- `app/api/chat/route.ts` — streaming agent loop (tool_use → execute → feed back)
- `lib/clinicalSystemPrompt.ts` — CareBot's identity, booking flow, escalation rules
- `lib/clinicalTools.ts` — Anthropic tool definitions
- `lib/toolHandlers.ts` — tool execution against Supabase + Twilio
- `app/page.tsx` — chat UI (SSE consumer)
- `app/dashboard/page.tsx` — today's schedule + counts by consultation type
- `app/appointments/page.tsx` — full appointment list with status actions
- `app/patients/page.tsx` — patient directory search
- `supabase/schema.sql` — patients / appointments / conversations / messages tables
- `docs/twilio-setup.md`, `docs/google-calendar-mcp.md` — optional integrations

## Notes on the port from the Replit prototype

- Express + Drizzle + pnpm workspace → single Next.js app + Supabase client,
  since Vercel serverless functions don't run a persistent Express server.
- The SSE agent loop is preserved (`/api/chat`), just re-implemented as a
  Next.js Route Handler returning a `ReadableStream` instead of an Express
  SSE response.
- `send_sms` keeps the same "stub until credentials exist" behavior as the
  original — see `docs/twilio-setup.md`.
- Google Calendar was a stubbed MCP integration in the prototype; see
  `docs/google-calendar-mcp.md` for two ways to add it here.
- Auto-provisioned Replit Postgres → Supabase (matches your existing stack
  across other EMC Digitals apps).

## Clinical scope

CareBot handles **scheduling only** — it does not give diagnoses or
treatment advice, and escalates described emergency symptoms to "call
emergency services / go to the nearest ER" rather than attempting to book
a routine slot. Review `lib/clinicalSystemPrompt.ts` before going live and
adjust working hours / doctor names / escalation wording to match your
current clinic setup.
