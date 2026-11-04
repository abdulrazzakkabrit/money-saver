-- Money Saver: run the business reminders every day at 06:00 UTC (08:00 in Cairo/Prague in winter, 07:00 in Tunis).
-- Paste ALL of this into Supabase -> SQL Editor -> New query, then press Run.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- remove an older copy of the job if it exists, then add it
select cron.unschedule(jobid) from cron.job where jobname = 'business-payment-reminders';
select cron.schedule(
  'business-payment-reminders',
  '0 6 * * *',
  $$ select net.http_post(
       url := 'https://mezbldxsyhxsgkmrwguq.supabase.co/functions/v1/business-reminders',
       headers := '{"Content-Type": "application/json", "x-cron-secret": "PASTE-YOUR-CRON_SECRET-HERE"}'::jsonb,
       body := '{}'::jsonb
     ); $$
);

-- shows the job, so you can see it was saved
select jobname, schedule, active from cron.job where jobname = 'business-payment-reminders';
