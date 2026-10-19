-- Only reads the existing authorized city views. No base-table or RLS changes.
-- A single bounds scan gets a scoped timeout; each subsequent page scans a
-- small primary-key interval instead of reclassifying the entire history.
create or replace function public.dashboard_protagon_lead_bounds(city text)
returns jsonb
language plpgsql stable security invoker
set search_path = ''
set statement_timeout = '45s'
as $$
declare
  first_id bigint;
  last_id bigint;
begin
  case city
    when 'protagon-joinville' then
      select min(id), max(id) into first_id, last_id from public.leads_protagon_joinville where deleted is null or deleted = 0;
    when 'protagon-porto-alegre' then
      select min(id), max(id) into first_id, last_id from public.leads_protagon_porto_alegre where deleted is null or deleted = 0;
    when 'protagon-goiania' then
      select min(id), max(id) into first_id, last_id from public.leads_protagon_goiania where deleted is null or deleted = 0;
    when 'protagon-sao-paulo' then
      select min(id), max(id) into first_id, last_id from public.leads_protagon_sao_paulo where deleted is null or deleted = 0;
    else
      raise exception 'Unsupported dashboard city' using errcode = '22023';
  end case;
  return jsonb_build_object('minId', first_id::text, 'maxId', last_id::text);
end;
$$;

revoke all on function public.dashboard_protagon_lead_bounds(text) from public, anon, authenticated;
grant execute on function public.dashboard_protagon_lead_bounds(text) to service_role;
notify pgrst, 'reload schema';
