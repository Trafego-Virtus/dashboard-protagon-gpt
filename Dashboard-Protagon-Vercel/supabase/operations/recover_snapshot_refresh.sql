-- DRAFT ONLY: not applied or approved. See docs/supabase-audit-2026-10-20.md.
-- This fixes cadence/validity but still fully rebuilds and rewrites snapshots.
-- Review the I/O reduction design before resuming production refresh jobs.
-- Recovery configuration. Apply while the four refresh jobs are paused.
-- Keep existing job activation state; resume only after checking database health.
create or replace function public.dashboard_protagon_refresh_snapshot(p_city text)
returns void language plpgsql security invoker
set search_path = ''
set statement_timeout = '90s'
as $$
declare
  source_view text;
  new_version uuid := gen_random_uuid();
  started_at timestamptz := statement_timestamp();
  total_rows integer;
begin
  source_view := case p_city
    when 'protagon-joinville' then 'leads_protagon_joinville'
    when 'protagon-porto-alegre' then 'leads_protagon_porto_alegre'
    when 'protagon-goiania' then 'leads_protagon_goiania'
    when 'protagon-sao-paulo' then 'leads_protagon_sao_paulo'
    else null end;
  if source_view is null then raise exception 'Unsupported dashboard city' using errcode = '22023'; end if;
  -- One refresh across all cities, including manual recovery calls.
  if not pg_try_advisory_xact_lock(hashtextextended('dashboard_snapshot:refresh', 0)) then
    raise exception 'Dashboard snapshot refresh already running' using errcode = '55P03';
  end if;

  -- One scan, then deterministic pages; preserve all existing fields and nulls.
  execute format($query$
    with leads as materialized (
      select id, data_hora, produto, praca, nome, email, numero, idade, renda,
        instagram, escolaridade, atuacao, estado_civil, tempo_wendell, nicho, tags,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term, sck, pageurl,
        clint, acao, tipo_ingestao, deleted
      from public.%I where deleted is null or deleted = 0
    ), numbered as (
      select to_jsonb(leads) as payload, row_number() over (order by id) as n,
        (count(*) over ())::integer as total from leads
    )
    insert into public.dashboard_protagon_snapshot_pages(city, version, page, source_at, row_count, rows)
    select $1, $2, ((n-1)/1000)::integer, $3, max(total), jsonb_agg(payload order by n)
    from numbered group by ((n-1)/1000)::integer
  $query$, source_view) using p_city, new_version, started_at;

  select p.row_count into total_rows from public.dashboard_protagon_snapshot_pages p
    where p.city=p_city and p.version=new_version and p.page=0;
  if total_rows is null then
    total_rows := 0;
    insert into public.dashboard_protagon_snapshot_pages values (p_city,new_version,0,started_at,0,'[]'::jsonb);
  end if;
  insert into public.dashboard_protagon_snapshots values (p_city,new_version,started_at,clock_timestamp(),total_rows)
    on conflict (city) do update set version=excluded.version, source_at=excluded.source_at,
      completed_at=excluded.completed_at, row_count=excluded.row_count;

  -- Atomic publication; earlier versions remain available for in-flight loads.
  delete from public.dashboard_protagon_snapshot_pages p
    where p.city=p_city and p.version<>new_version and p.source_at < started_at - interval '60 minutes';
end;
$$;
revoke all on function public.dashboard_protagon_refresh_snapshot(text) from public, anon, authenticated, service_role;

create or replace function public.dashboard_protagon_lead_page(p_city text, p_page integer default 0, p_version uuid default null)
returns jsonb language plpgsql stable security invoker
set search_path = ''
as $$
declare
  selected_version uuid := p_version;
  updated_at timestamptz;
  result public.dashboard_protagon_snapshot_pages%rowtype;
begin
  if p_page < 0 or p_page > 1000 then raise exception 'Invalid page' using errcode = '22023'; end if;
  if selected_version is null then
    select s.version,s.source_at into selected_version,updated_at
      from public.dashboard_protagon_snapshots s where s.city=p_city;
    if selected_version is null or updated_at < statement_timestamp() - interval '45 minutes' then
      raise exception 'Dashboard snapshot unavailable or stale' using errcode = 'P0001';
    end if;
  end if;
  select * into result from public.dashboard_protagon_snapshot_pages p
    where p.city=p_city and p.version=selected_version and p.page=p_page;
  if not found or result.source_at < statement_timestamp() - interval '60 minutes' then
    raise exception 'Dashboard snapshot expired' using errcode = 'P0001';
  end if;
  return jsonb_build_object('rows',result.rows,'snapshot',selected_version,
    'sourceUpdatedAt',result.source_at,'totalRows',result.row_count,'page',result.page,'pageSize',1000);
end;
$$;
revoke all on function public.dashboard_protagon_lead_page(text,integer,uuid) from public, anon, authenticated;
grant execute on function public.dashboard_protagon_lead_page(text,integer,uuid) to service_role;


select cron.alter_job(jobid, schedule := '0,30 * * * *',
  command := $$set statement_timeout = '90s'; select public.dashboard_protagon_refresh_snapshot('protagon-joinville');$$)
from cron.job where jobname = 'protagon-snapshot-joinville';

select cron.alter_job(jobid, schedule := '5,35 * * * *',
  command := $$set statement_timeout = '90s'; select public.dashboard_protagon_refresh_snapshot('protagon-porto-alegre');$$)
from cron.job where jobname = 'protagon-snapshot-porto-alegre';

select cron.alter_job(jobid, schedule := '10,40 * * * *',
  command := $$set statement_timeout = '90s'; select public.dashboard_protagon_refresh_snapshot('protagon-goiania');$$)
from cron.job where jobname = 'protagon-snapshot-goiania';

select cron.alter_job(jobid, schedule := '15,45 * * * *',
  command := $$set statement_timeout = '90s'; select public.dashboard_protagon_refresh_snapshot('protagon-sao-paulo');$$)
from cron.job where jobname = 'protagon-snapshot-sao-paulo';

notify pgrst, 'reload schema';
