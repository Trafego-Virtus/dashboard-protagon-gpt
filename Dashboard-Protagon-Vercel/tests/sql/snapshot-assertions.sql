create function pg_temp.assert_snapshot_matches(p_city text) returns void language plpgsql as $$
declare actual jsonb; expected jsonb; meta record; doc jsonb; n integer; pages integer;
begin
  select * into strict meta from pg_temp.dashboard_protagon_snapshots where city=p_city;
  execute format('select coalesce(jsonb_agg(to_jsonb(v) order by id),''[]''::jsonb)
    from pg_temp.%I v where deleted is null or deleted=0',
    'leads_'||replace(p_city,'-','_')) into expected;
  actual := '[]'::jsonb;
  pages := greatest(1,ceil(meta.row_count/1000.0)::integer);
  for n in 0..pages-1 loop
    doc := pg_temp.dashboard_protagon_lead_page(p_city,n,meta.version);
    if (doc->>'snapshot')::uuid<>meta.version or (doc->>'totalRows')::integer<>meta.row_count
      or (doc->>'page')::integer<>n or (doc->>'pageSize')::integer<>1000
      or (doc->>'sourceUpdatedAt')::timestamptz<>meta.source_at then
      raise exception 'Snapshot contract mismatch';
    end if;
    actual := actual || (doc->'rows');
  end loop;
  if actual<>expected or jsonb_array_length(actual)<>meta.row_count then
    raise exception 'Snapshot contents differ from all 27 source fields';
  end if;
end;
$$;

do $$
declare
  v_city text := 'protagon-joinville'; old_version uuid; before_version uuid;
  before_pages integer; after_pages integer; saved_page jsonb; doc jsonb;
begin
  -- Initial publish, exact field/null/order/row-count preservation, empty city.
  perform pg_temp.dashboard_protagon_refresh_snapshot(v_city);
  perform pg_temp.assert_snapshot_matches(v_city);
  select s.version into old_version from pg_temp.dashboard_protagon_snapshots s where s.city=v_city;
  saved_page := pg_temp.dashboard_protagon_lead_page(v_city,0,old_version);
  select count(*) into before_pages from pg_temp.dashboard_protagon_snapshot_pages;
  if before_pages<>2 then raise exception 'Expected two initial payload pages'; end if;

  -- An unchanged full check renews validity without inserting any payload pages.
  perform pg_temp.dashboard_protagon_refresh_snapshot(v_city);
  select count(*) into after_pages from pg_temp.dashboard_protagon_snapshot_pages;
  if after_pages<>before_pages then raise exception 'Unchanged payload was duplicated'; end if;
  if pg_temp.dashboard_protagon_lead_page(v_city,0,old_version)<>saved_page then
    raise exception 'Pinned response changed during replacement'; end if;
  perform pg_temp.assert_snapshot_matches(v_city);

  -- Updating an existing lead rewrites only the affected page.
  update pg_temp.snapshot_fixture set nome='Changed' where id=1;
  perform pg_temp.dashboard_protagon_refresh_snapshot(v_city);
  select count(*) into after_pages from pg_temp.dashboard_protagon_snapshot_pages;
  if after_pages<>before_pages+1 then raise exception 'Expected one changed page'; end if;
  before_pages := after_pages;
  perform pg_temp.assert_snapshot_matches(v_city);

  -- Appending changes the last page, preserving the rest and the old generation.
  insert into pg_temp.snapshot_fixture(id,fixture_city,nome) values(1002,v_city,'Append');
  perform pg_temp.dashboard_protagon_refresh_snapshot(v_city);
  select count(*) into after_pages from pg_temp.dashboard_protagon_snapshot_pages;
  if after_pages<>before_pages+1 then raise exception 'Append copied unchanged pages'; end if;
  perform pg_temp.assert_snapshot_matches(v_city);
  if pg_temp.dashboard_protagon_lead_page(v_city,0,old_version)<>saved_page then
    raise exception 'Old data/count changed during append'; end if;

  -- Old-ID insertion, soft/hard deletion and city moves cannot be missed.
  insert into pg_temp.snapshot_fixture(id,fixture_city,nome) values(-1,v_city,'Late');
  perform pg_temp.dashboard_protagon_refresh_snapshot(v_city);
  perform pg_temp.assert_snapshot_matches(v_city);
  update pg_temp.snapshot_fixture set deleted=1 where id=5;
  delete from pg_temp.snapshot_fixture where id=6;
  update pg_temp.snapshot_fixture set fixture_city='protagon-goiania' where id=1;
  perform pg_temp.dashboard_protagon_refresh_snapshot(v_city);
  perform pg_temp.dashboard_protagon_refresh_snapshot('protagon-goiania');
  perform pg_temp.assert_snapshot_matches(v_city);
  perform pg_temp.assert_snapshot_matches('protagon-goiania');

  -- A source failure rolls back all cache changes and never renews freshness.
  select s.version into before_version from pg_temp.dashboard_protagon_snapshots s where s.city=v_city;
  select count(*) into before_pages from pg_temp.dashboard_protagon_snapshot_pages;
  update pg_temp.snapshot_fixture set nome='FAIL_TEST' where id=2;
  begin
    perform pg_temp.dashboard_protagon_refresh_snapshot(v_city);
    raise exception 'Expected source failure';
  exception when invalid_text_representation then null; end;
  if before_version<>(select s.version from pg_temp.dashboard_protagon_snapshots s where s.city=v_city)
    or before_pages<>(select count(*) from pg_temp.dashboard_protagon_snapshot_pages) then
    raise exception 'Failed refresh changed published state'; end if;
  update pg_temp.snapshot_fixture set nome='Synthetic' where id=2;

  -- Fresh manifests can reuse payloads older than the freshness window.
  update pg_temp.dashboard_protagon_snapshot_pages set source_at=statement_timestamp()-interval '2 days';
  perform pg_temp.dashboard_protagon_refresh_snapshot(v_city);
  perform pg_temp.dashboard_protagon_lead_page(v_city);
  select s.version into before_version from pg_temp.dashboard_protagon_snapshots s where s.city=v_city;

  -- Expiry is counted from replacement; GC cannot delete shared current pages.
  update pg_temp.dashboard_protagon_snapshot_manifest m set expires_at=statement_timestamp()-interval '1 minute'
    where m.city=v_city and m.version<>before_version;
  begin
    perform pg_temp.dashboard_protagon_lead_page(v_city,0,old_version);
    raise exception 'Expired generation was served';
  exception when raise_exception then
    if sqlerrm<>'Dashboard snapshot expired' then raise; end if;
  end;
  perform pg_temp.dashboard_protagon_refresh_snapshot(v_city);
  perform pg_temp.assert_snapshot_matches(v_city);
  if exists(select 1 from pg_temp.dashboard_protagon_snapshot_pages p where p.city=v_city
    and not exists(select 1 from pg_temp.dashboard_protagon_snapshot_manifest m
      where m.city=p.city and m.payload_version=p.version and m.page=p.page)) then
    raise exception 'Unreferenced payload survived cleanup'; end if;

  -- 30-minute scheduling: new loads valid through 45 minutes, pinned through 60.
  select s.version into before_version from pg_temp.dashboard_protagon_snapshots s where s.city=v_city;
  update pg_temp.dashboard_protagon_snapshots s set source_at=statement_timestamp()-interval '40 minutes' where s.city=v_city;
  update pg_temp.dashboard_protagon_snapshot_manifest m set source_at=statement_timestamp()-interval '40 minutes'
    where m.city=v_city and m.version=before_version;
  perform pg_temp.dashboard_protagon_lead_page(v_city);
  update pg_temp.dashboard_protagon_snapshots s set source_at=statement_timestamp()-interval '46 minutes' where s.city=v_city;
  update pg_temp.dashboard_protagon_snapshot_manifest m set source_at=statement_timestamp()-interval '46 minutes'
    where m.city=v_city and m.version=before_version;
  begin
    perform pg_temp.dashboard_protagon_lead_page(v_city);
    raise exception 'Stale new load was accepted';
  exception when raise_exception then
    if sqlerrm<>'Dashboard snapshot unavailable or stale' then raise; end if;
  end;
  perform pg_temp.dashboard_protagon_lead_page(v_city,0,before_version);
  update pg_temp.dashboard_protagon_snapshot_manifest m set source_at=statement_timestamp()-interval '61 minutes'
    where m.city=v_city and m.version=before_version;
  begin
    perform pg_temp.dashboard_protagon_lead_page(v_city,0,before_version);
    raise exception 'Expired pinned load was accepted';
  exception when raise_exception then
    if sqlerrm<>'Dashboard snapshot expired' then raise; end if;
  end;

  -- Empty snapshots are valid and also reuse their single empty payload page.
  perform pg_temp.dashboard_protagon_refresh_snapshot('protagon-porto-alegre');
  perform pg_temp.assert_snapshot_matches('protagon-porto-alegre');
  select count(*) into before_pages from pg_temp.dashboard_protagon_snapshot_pages;
  perform pg_temp.dashboard_protagon_refresh_snapshot('protagon-porto-alegre');
  select count(*) into after_pages from pg_temp.dashboard_protagon_snapshot_pages;
  if before_pages<>after_pages then raise exception 'Empty payload was duplicated'; end if;
  begin
    perform pg_temp.dashboard_protagon_refresh_snapshot('invalid-city');
    raise exception 'Invalid city accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform pg_temp.dashboard_protagon_lead_page(v_city,null);
    raise exception 'Null page accepted';
  exception when invalid_parameter_value then null; end;
end;
$$;
-- These objects live only in this connection's temporary schema.
-- Any exception aborts the surrounding migration before production DDL is reached.
