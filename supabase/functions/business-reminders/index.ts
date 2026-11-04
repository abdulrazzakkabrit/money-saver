// Supabase Edge Function: once a day, tell each business account about payments that are due soon or overdue.
// The app's own notifications only run while the app is open; this one reaches the phone when it is closed.
//
// Secrets to set (Supabase dashboard, or `supabase secrets set NAME=value`):
//   VAPID_PUBLIC_KEY   same public key as VAPID_PUBLIC in index.html
//   VAPID_PRIVATE_KEY  the matching private key (not stored in this repository)
//   VAPID_SUBJECT      a contact address for push services, written as mailto:you@example.com
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
// Deploy: supabase functions deploy business-reminders --no-verify-jwt
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { dueItems, reminderText } from './logic.js';

Deno.serve(async (req) => {
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!key || req.headers.get('Authorization') !== `Bearer ${key}`) {
    return new Response('forbidden', { status: 403 });
  }
  const db = createClient(Deno.env.get('SUPABASE_URL')!, key);
  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT')!,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!
  );
  const today = new Date().toISOString().slice(0, 10);
  const { data: rows, error } = await db.from('budgets').select('user_id,data').eq('data->>accountType', 'business');
  if (error) return new Response(error.message, { status: 500 });
  let sent = 0, removed = 0;
  for (const row of rows ?? []) {
    const items = dueItems(row.data, today);
    if (!items.length) continue;
    const payload = JSON.stringify(reminderText(items));
    const { data: subs } = await db.from('push_subscriptions').select('endpoint,subscription').eq('user_id', row.user_id);
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(s.subscription, payload);
        sent++;
      } catch (e) {
        // 404 or 410: the phone or browser has removed this subscription
        if (e && (e.statusCode === 404 || e.statusCode === 410)) {
          await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
          removed++;
        }
      }
    }
  }
  return Response.json({ checked: rows?.length ?? 0, sent, removed });
});
