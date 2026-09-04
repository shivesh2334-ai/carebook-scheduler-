# Twilio SMS setup

`send_sms` in `lib/toolHandlers.ts` runs as a logging stub until Twilio
credentials are present. To activate real SMS:

1. Create a Twilio account and buy/verify a sending number.
2. In your Vercel project → Settings → Environment Variables, add:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_FROM_NUMBER` (E.164 format, e.g. `+91XXXXXXXXXX`)
3. Redeploy. `sendSms()` will automatically switch from the stub to a real
   `twilio.messages.create(...)` call — no code changes needed.
4. For India-specific SMS (DLT compliance), register your sender ID and
   message templates with your Twilio-approved DLT provider before going
   live; transactional appointment confirmations typically need a
   pre-approved template.
