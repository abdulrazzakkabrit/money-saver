-- ==========================================================
-- Money Saver: background payment reminders for business accounts.
-- Run once in Supabase Dashboard -> SQL Editor. Read the notes first.
-- Needs: the business-reminders function deployed, and the VAPID secrets set.
-- ==========================================================

-- 1) The phone list. Your project already has this table (the motivation notifications use it),
--    so these lines change nothing there. They only matter on a brand-new project.
create table if not exists public.push_subscriptions (
  endpoint     text primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  subscription jsonb not null,
  created_at   timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "push: manage own" on public.push_subscriptions;
create policy "push: manage own" on public.push_subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2) Store the service role key in Vault, so the scheduled job can call the function.
--    Run this once, replacing the placeholder with the key from Project Settings -> API.
--    select vault.create_secret('PASTE-SERVICE-ROLE-KEY-HERE', 'service_role_key');

-- 3) Daily job at 06:00 UTC: calls the function (needs pg_cron and pg_net, both available on Supabase)
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule(
  'business-payment-reminders',
  '0 6 * * *',
  $$ select net.http_post(
       url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/business-reminders',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
       )
     ); $$
);
