# Background payment reminders (business accounts)

What this does: once a day, Supabase checks every business account and sends a phone notification
when a payment is due within the chosen number of days, or is overdue. This works while the app is closed.
It also reminds a business to order stock again when a product's order has run out (last delivery + how long one
order lasts). Business plans (new businesses not open yet) get no reminders.

Status: written and tested for the rules (`node test-logic.mjs`). Not deployed. Deploying needs
steps only the owner of the Supabase project can take.

## Steps (owner)

1. Do NOT create a new VAPID key pair. Phones already receive the motivation notifications with the app
   closed, so a key pair is already in use: its public half is `VAPID_PUBLIC` in `index.html`, and its
   private half is wherever the motivation notifications are sent from (usually a secret in Supabase:
   Edge Functions -> Secrets). Use that same pair. A new pair would stop every phone that is already
   signed up from receiving notifications until each user turns them on again.
2. Run `business-reminders.sql` in the Supabase SQL editor. Replace `YOUR-PROJECT-REF` with your project
   reference, and store the service role key in Vault (the commented line in the file shows how).
3. Deploy the function from the Supabase CLI:
   `supabase functions deploy business-reminders --no-verify-jwt`
4. Set the secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` to the same values the
   motivation sender uses. If they are already set under these names in the same Supabase project, skip this.
5. Test it: call the function once with the service role key as the bearer token. It should answer
   with the number of accounts checked and notifications sent.

## Known limits

- Dates are in UTC. A reminder can arrive a few hours before or after the local day changes.
- A reminder is sent every day until the payment is marked paid, not once.
- Only phones and browsers that turned on notifications in the app receive reminders: the same ones that get
  the motivation messages.
- Payment reminders use their own tag (`money-saver-payments`), so they show beside the motivation message
  instead of replacing it. This needs the updated `sw.js` from version 1.2.0.
- Nothing has been sent to a real phone yet.
