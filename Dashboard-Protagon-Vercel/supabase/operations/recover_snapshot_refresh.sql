-- Apply once, with refresh jobs paused. Source views and ingestion are unchanged.
-- Immutable payload pages are shared by small, versioned manifests.
create table public.dashboard_protagon_snapshot_manifest (
  city text not null,
  version uuid not null,
  page integer not null check (page >= 0),
  payload_version uuid not null,
  source_at timestamptz not null,
  row_count integer not null check (row_count >= 0),
  expires_at timestamptz,
  primary key (city, version, page),
  foreign key (city, payload_version, page)
    references public.dashboard_protagon_snapshot_pages(city, version, page)
);
create index dashboard_snapshot_manifest_payload_idx
  on public.dashboard_protagon_snapshot_manifest(city, payload_version, page);
alter table public.dashboard_protagon_snapshot_manifest enable row level security;
revoke all on public.dashboard_protagon_snapshot_manifest from public, anon, authenticated, service_role;
grant select on public.dashboard_protagon_snapshot_manifest to service_role;

-- Preserve existing payloads and pinned versions during the transition.
insert into public.dashboard_protagon_snapshot_manifest
  (city,version,page,payload_version,source_at,row_count,expires_at)
select p.city,p.version,p.page,p.version,p.source_at,p.row_count,
  case when p.version=s.version then null else statement_timestamp()+interval '15 minutes' end
from public.dashboard_protagon_snapshot_pages p
left join public.dashboard_protagon_snapshots s on s.city=p.city;

create or replace function public.dashboard_protagon_refresh_snapshot(p_city text)
returns void language plpgsql security invoker
set search_path = ''
set statement_timeout = '90s'
as $$
declare
  source_view text;
  new_version uuid := gen_random_uuid();
  previous_version uuid;
  payload_version uuid;
  started_at timestamptz := statement_timestamp();
  published_at timestamptz;
  total_rows integer := 0;
  batch record;
begin
  source_view := case p_city
    when 'protagon-joinville' then 'leads_protagon_joinville'
    when 'protagon-porto-alegre' then 'leads_protagon_porto_alegre'
    when 'protagon-goiania' then 'leads_protagon_goiania'
    when 'protagon-sao-paulo' then 'leads_protagon_sao_paulo'
    else null end;
  if source_view is null then raise exception 'Unsupported dashboard city' using errcode = '22023'; end if;
  -- Serialize preparations across all cities; never report a skipped run as success.
  if not pg_try_advisory_xact_lock(hashtextextended('dashboard_snapshot:refresh', 0)) then
    raise exception 'Dashboard snapshot refresh already running' using errcode = '55P03';
  end if;
  select s.version into previous_version from public.dashboard_protagon_snapshots s where s.city=p_city;

  -- One consistent source query, the same 27 fields and deterministic 1000-row pages.
  -- No materialized full-source CTE or count(*) window over every lead.
  for batch in execute format($query$
    with leads as (
      select id, data_hora, produto, praca, nome, email, numero, idade, renda,
        instagram, escolaridade, atuacao, estado_civil, tempo_wendell, nicho, tags,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term, sck, pageurl,
        clint, acao, tipo_ingestao, deleted
      from public.%I where deleted is null or deleted = 0
    ), numbered as (
      select to_jsonb(leads) as payload, row_number() over (order by id) as n from leads
    )
    select ((n-1)/1000)::integer as page, count(*)::integer as page_rows,
      jsonb_agg(payload order by n) as rows
    from numbered group by ((n-1)/1000)::integer order by 1
  $query$, source_view)
  loop
    total_rows := total_rows + batch.page_rows;
    -- Exact comparison detects edits, removals and old-ID inserts, not just appends.
    select p.version into payload_version
    from public.dashboard_protagon_snapshot_manifest m
    join public.dashboard_protagon_snapshot_pages p
      on p.city=m.city and p.version=m.payload_version and p.page=m.page
    where m.city=p_city and m.version=previous_version and m.page=batch.page
      and p.rows=batch.rows;
    if payload_version is null then
      payload_version := new_version;
      insert into public.dashboard_protagon_snapshot_pages(city,version,page,source_at,row_count,rows)
      values (p_city,new_version,batch.page,started_at,0,batch.rows);
    end if;
    insert into public.dashboard_protagon_snapshot_manifest
      (city,version,page,payload_version,source_at,row_count)
    values (p_city,new_version,batch.page,payload_version,started_at,0);
  end loop;

  if total_rows=0 then
    select p.version into payload_version
    from public.dashboard_protagon_snapshot_manifest m
    join public.dashboard_protagon_snapshot_pages p
      on p.city=m.city and p.version=m.payload_version and p.page=m.page
    where m.city=p_city and m.version=previous_version and m.page=0 and p.rows='[]'::jsonb;
    if payload_version is null then
      payload_version := new_version;
      insert into public.dashboard_protagon_snapshot_pages(city,version,page,source_at,row_count,rows)
      values (p_city,new_version,0,started_at,0,'[]'::jsonb);
    end if;
    insert into public.dashboard_protagon_snapshot_manifest
      (city,version,page,payload_version,source_at,row_count)
    values (p_city,new_version,0,payload_version,started_at,0);
  end if;

  update public.dashboard_protagon_snapshot_manifest m set row_count=total_rows
    where m.city=p_city and m.version=new_version;
  -- Compatibility metadata only; reused JSON payloads remain immutable.
  update public.dashboard_protagon_snapshot_pages p set row_count=total_rows
    where p.city=p_city and p.version=new_version and p.row_count<>total_rows;
  published_at := clock_timestamp();
  update public.dashboard_protagon_snapshot_manifest m set expires_at=published_at+interval '15 minutes'
    where m.city=p_city and m.version=previous_version and m.expires_at is null;
  insert into public.dashboard_protagon_snapshots(city,version,source_at,completed_at,row_count)
  values (p_city,new_version,started_at,published_at,total_rows)
    on conflict (city) do update set version=excluded.version, source_at=excluded.source_at,
      completed_at=excluded.completed_at, row_count=excluded.row_count;

  -- Retire manifests first. A payload is deleted only when no generation needs it.
  delete from public.dashboard_protagon_snapshot_manifest m
    where m.city=p_city and m.version<>new_version and m.expires_at<=published_at;
  delete from public.dashboard_protagon_snapshot_pages p
    where p.city=p_city and not exists (
      select 1 from public.dashboard_protagon_snapshot_manifest m
      where m.city=p.city and m.payload_version=p.version and m.page=p.page
    );
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
  result record;
begin
  if p_page is null or p_page < 0 or p_page > 1000 then
    raise exception 'Invalid page' using errcode = '22023';
  end if;
  if selected_version is null then
    select s.version,s.source_at into selected_version,updated_at
      from public.dashboard_protagon_snapshots s where s.city=p_city;
    if selected_version is null or updated_at < statement_timestamp() - interval '45 minutes' then
      raise exception 'Dashboard snapshot unavailable or stale' using errcode = 'P0001';
    end if;
  end if;
  select m.page,m.source_at,m.row_count,m.expires_at,p.rows into result
  from public.dashboard_protagon_snapshot_manifest m
  join public.dashboard_protagon_snapshot_pages p
    on p.city=m.city and p.version=m.payload_version and p.page=m.page
  where m.city=p_city and m.version=selected_version and m.page=p_page;
  if not found then raise exception 'Dashboard snapshot expired' using errcode = 'P0001'; end if;
  if result.source_at < statement_timestamp() - interval '60 minutes'
    or result.expires_at <= statement_timestamp() then
    raise exception 'Dashboard snapshot expired' using errcode = 'P0001';
  end if;
  return jsonb_build_object('rows',result.rows,'snapshot',selected_version,
    'sourceUpdatedAt',result.source_at,'totalRows',result.row_count,'page',result.page,'pageSize',1000);
end;
$$;
revoke all on function public.dashboard_protagon_lead_page(text,integer,uuid) from public, anon, authenticated;
grant execute on function public.dashboard_protagon_lead_page(text,integer,uuid) to service_role;

-- Remain paused until a sequential refresh and read validation have succeeded.
select cron.alter_job(jobid, schedule := '0,30 * * * *', active := false,
  command := $$set statement_timeout = '90s'; select public.dashboard_protagon_refresh_snapshot('protagon-joinville');$$)
from cron.job where jobname = 'protagon-snapshot-joinville';
select cron.alter_job(jobid, schedule := '5,35 * * * *', active := false,
  command := $$set statement_timeout = '90s'; select public.dashboard_protagon_refresh_snapshot('protagon-porto-alegre');$$)
from cron.job where jobname = 'protagon-snapshot-porto-alegre';
select cron.alter_job(jobid, schedule := '10,40 * * * *', active := false,
  command := $$set statement_timeout = '90s'; select public.dashboard_protagon_refresh_snapshot('protagon-goiania');$$)
from cron.job where jobname = 'protagon-snapshot-goiania';
select cron.alter_job(jobid, schedule := '15,45 * * * *', active := false,
  command := $$set statement_timeout = '90s'; select public.dashboard_protagon_refresh_snapshot('protagon-sao-paulo');$$)
from cron.job where jobname = 'protagon-snapshot-sao-paulo';
notify pgrst, 'reload schema';
