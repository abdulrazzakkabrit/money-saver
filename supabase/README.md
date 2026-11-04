# Phone reminders for business accounts (when the app is closed)

Once a day, Supabase checks every running business and sends a phone notification for payments due soon
or overdue, and for stock that needs ordering again. Business plans (not open yet) get none.
It uses the same notification key and phone list as the motivation messages.

## Setup in the Supabase website (no programs needed)

1. **Secrets** – Edge Functions → Secrets. Your notification private key should already be there (the
   motivation messages use it). Add one more secret: `CRON_SECRET` = the private value you were given.
   Do not create a new notification key: that would stop phones that are already signed up.
2. **Function** – Edge Functions → Deploy a new function → Via editor. Name it `business-reminders`,
   replace the code with `functions/business-reminders/index.ts`, and deploy.
   Then in the function's settings, turn **off** "Enforce JWT verification" (the daily job uses `CRON_SECRET` instead).
3. **Daily job** – SQL Editor → New query. Paste `business-reminders.sql`, put your `CRON_SECRET` value in place of
   `PASTE-YOUR-CRON_SECRET-HERE`, and press Run.
4. **Test** – open the function → Test (or Invoke), add the header `x-cron-secret` with your value, and send.
   The answer shows how many business accounts were checked and how many notifications were sent.
   If it says "No VAPID private key found", it lists the secret names it can see.

## Known limits

- Runs at 06:00 UTC. A reminder can arrive a few hours before or after the local day changes.
- A reminder repeats every day until the payment is marked paid or the stock delivery is recorded.
- Only phones and browsers that turned on notifications in the app receive reminders.
- `logic.js` and `test-logic.mjs` hold the same rules for testing (`node test-logic.mjs`).
