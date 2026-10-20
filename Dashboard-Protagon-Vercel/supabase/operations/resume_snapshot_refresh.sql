-- Run only after sequentially refreshing and validating all four cities.
-- Leaves the verified 30-minute schedules and 90-second commands unchanged.
do $$ begin
  if (select count(*) from public.dashboard_protagon_snapshots
    where city in ('protagon-joinville','protagon-porto-alegre','protagon-goiania','protagon-sao-paulo')
      and completed_at>statement_timestamp()-interval '10 minutes')<>4 then
    raise exception 'Four freshly validated cities are required';
  end if;
end; $$;
select cron.alter_job(jobid, active := true) from cron.job
where jobname in ('protagon-snapshot-joinville','protagon-snapshot-porto-alegre',
  'protagon-snapshot-goiania','protagon-snapshot-sao-paulo');
select jobname,schedule,active from cron.job
where jobname in ('protagon-snapshot-joinville','protagon-snapshot-porto-alegre',
  'protagon-snapshot-goiania','protagon-snapshot-sao-paulo');
