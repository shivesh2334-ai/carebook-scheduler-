# Google Calendar sync (optional)

The current build computes availability entirely from the `appointments`
table in Supabase (working hours minus booked slots) — there's no external
calendar dependency for the core scheduling loop. If you want two-way sync
with a real Google Calendar (e.g. so Dr. Kumar's personal calendar reflects
clinic bookings), two integration paths work well from Vercel:

## Option A — Service account (simplest, one-way push)
1. Create a Google Cloud service account, enable the Calendar API.
2. Share your clinic's Google Calendar with the service account's email
   (Editor access).
3. Add to Vercel env vars:
   - `GOOGLE_CALENDAR_ID`
   - `GOOGLE_CALENDAR_CLIENT_EMAIL`
   - `GOOGLE_CALENDAR_PRIVATE_KEY` (keep the `\n` escapes intact)
4. In `lib/toolHandlers.ts`, extend `bookAppointment` / `cancelAppointment`
   to also call the Calendar API (`googleapis` package) after the Supabase
   write succeeds, so Supabase remains the source of truth and Calendar is
   a mirror.

## Option B — MCP connector
If you're calling the agent from Claude.ai/Claude Code directly (rather than
this hosted web app), you can attach the official Google Calendar MCP server
to the Anthropic API call via the `mcp_servers` parameter instead of writing
custom `googleapis` code. This app's own `/api/chat` route currently uses
direct tool-calling against Supabase rather than MCP, since the booking
logic needs to be transactional against the appointments table — MCP is a
good fit if you later want the agent itself to browse/edit a calendar that
Supabase doesn't own.
