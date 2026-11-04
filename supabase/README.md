# Background payment reminders (business accounts)

What this does: once a day, Supabase checks every business account and sends a phone notification
when a payment is due within the chosen number of days, or is overdue. This works while the app is closed.

Status: written and tested for the rules (`node test-logic.mjs`). Not deployed. Deploying needs
steps only the owner of the Supabase project can take.

## Steps (owner)

1. Create the VAPID key pair once, if you do not already have one. The public key must match
   `VAPID_PUBLIC` in `index.html`. The private key stays secret and is not stored in this repository.
2. Run `business-reminders.sql` in the Supabase SQL editor. Replace `YOUR-PROJECT-REF` with your project
   reference, and store the service role key in Vault (the commented line in the file shows how).
3. Deploy the function from the Supabase CLI:
   `supabase functions deploy business-reminders --no-verify-jwt`
4. Set the secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (for example `mailto:support@your-domain`).
5. Test it: call the function once with the service role key as the bearer token. It should answer
   with the number of accounts checked and notifications sent.

## Known limits

- Dates are in UTC. A reminder can arrive a few hours before or after the local day changes.
- A reminder is sent every day until the payment is marked paid, not once.
- Only subscriptions saved from the app's notification settings receive reminders.
- Nothing has been sent to a real phone yet.
