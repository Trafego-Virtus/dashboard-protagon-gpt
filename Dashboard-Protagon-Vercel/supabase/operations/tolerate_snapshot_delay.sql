-- Keep the last complete generation readable through a missed 30-minute run.
-- The UI explicitly warns after 45 minutes; never renew source_at on a failed job.
-- No job, source view, payload or business rule is changed.
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
    if selected_version is null or updated_at < statement_timestamp() - interval '90 minutes' then
      raise exception 'Dashboard snapshot unavailable or stale' using errcode = 'P0001';
    end if;
  end if;
  select m.page,m.source_at,m.row_count,m.expires_at,p.rows into result
  from public.dashboard_protagon_snapshot_manifest m
  join public.dashboard_protagon_snapshot_pages p
    on p.city=m.city and p.version=m.payload_version and p.page=m.page
  where m.city=p_city and m.version=selected_version and m.page=p_page;
  if not found then raise exception 'Dashboard snapshot expired' using errcode = 'P0001'; end if;
  if result.source_at < statement_timestamp() - interval '105 minutes'
    or result.expires_at <= statement_timestamp() then
    raise exception 'Dashboard snapshot expired' using errcode = 'P0001';
  end if;
  return jsonb_build_object('rows',result.rows,'snapshot',selected_version,
    'sourceUpdatedAt',result.source_at,'versionExpiresAt',result.expires_at,
    'sourceDelayed',result.source_at < statement_timestamp()-interval '45 minutes','totalRows',result.row_count,'page',result.page,'pageSize',1000);
end;
$$;
revoke all on function public.dashboard_protagon_lead_page(text,integer,uuid) from public, anon, authenticated;
grant execute on function public.dashboard_protagon_lead_page(text,integer,uuid) to service_role;

notify pgrst, 'reload schema';
