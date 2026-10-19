-- Prepare reads from the four authorized city views. No source-table changes.
create extension if not exists pg_cron;

create table public.dashboard_protagon_snapshots (
  city text primary key check (city in ('protagon-joinville','protagon-porto-alegre','protagon-goiania','protagon-sao-paulo')),
  version uuid not null,
  source_at timestamptz not null,
  completed_at timestamptz not null,
  row_count integer not null check (row_count >= 0)
);
create table public.dashboard_protagon_snapshot_pages (
  city text not null,
  version uuid not null,
  page integer not null check (page >= 0),
  source_at timestamptz not null,
  row_count integer not null check (row_count >= 0),
  rows jsonb not null check (jsonb_typeof(rows) = 'array'),
  primary key (city, version, page)
);
alter table public.dashboard_protagon_snapshots enable row level security;
alter table public.dashboard_protagon_snapshot_pages enable row level security;
revoke all on public.dashboard_protagon_snapshots, public.dashboard_protagon_snapshot_pages from public, anon, authenticated, service_role;
grant select on public.dashboard_protagon_snapshots, public.dashboard_protagon_snapshot_pages to service_role;

-- Owner-only refresh: a browser request cannot trigger an expensive scan.
create function public.dashboard_protagon_refresh_snapshot(p_city text)
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
  if not pg_try_advisory_xact_lock(hashtextextended('dashboard_snapshot:' || p_city, 0)) then return; end if;

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
    where p.city=p_city and p.version<>new_version and p.source_at < started_at - interval '15 minutes';
end;
$$;
revoke all on function public.dashboard_protagon_refresh_snapshot(text) from public, anon, authenticated, service_role;

create function public.dashboard_protagon_lead_page(p_city text, p_page integer default 0, p_version uuid default null)
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
    if selected_version is null or updated_at < statement_timestamp() - interval '10 minutes' then
      raise exception 'Dashboard snapshot unavailable or stale' using errcode = 'P0001';
    end if;
  end if;
  select * into result from public.dashboard_protagon_snapshot_pages p
    where p.city=p_city and p.version=selected_version and p.page=p_page;
  if not found or result.source_at < statement_timestamp() - interval '15 minutes' then
    raise exception 'Dashboard snapshot expired' using errcode = 'P0001';
  end if;
  return jsonb_build_object('rows',result.rows,'snapshot',selected_version,
    'sourceUpdatedAt',result.source_at,'totalRows',result.row_count,'page',result.page,'pageSize',1000);
end;
$$;
revoke all on function public.dashboard_protagon_lead_page(text,integer,uuid) from public, anon, authenticated;
grant execute on function public.dashboard_protagon_lead_page(text,integer,uuid) to service_role;

-- Stagger scans to avoid four heavy queries running simultaneously.
select cron.schedule('protagon-snapshot-joinville','0-59/5 * * * *',
  $$select public.dashboard_protagon_refresh_snapshot('protagon-joinville')$$);
select cron.schedule('protagon-snapshot-porto-alegre','1-59/5 * * * *',
  $$select public.dashboard_protagon_refresh_snapshot('protagon-porto-alegre')$$);
select cron.schedule('protagon-snapshot-goiania','2-59/5 * * * *',
  $$select public.dashboard_protagon_refresh_snapshot('protagon-goiania')$$);
select cron.schedule('protagon-snapshot-sao-paulo','3-59/5 * * * *',
  $$select public.dashboard_protagon_refresh_snapshot('protagon-sao-paulo')$$);
select cron.schedule('protagon-snapshot-log-cleanup','17 3 * * *',
  $$delete from cron.job_run_details where jobid in
    (select jobid from cron.job where jobname like 'protagon-snapshot-%')
    and end_time < now() - interval '7 days'$$);
notify pgrst, 'reload schema';
