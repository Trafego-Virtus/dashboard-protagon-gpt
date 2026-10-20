-- Small synthetic source. Never reads or changes production source records.
create temporary table snapshot_fixture (
  id bigint primary key, fixture_city text not null,
  data_hora text, produto text, praca text, nome text, email text, numero text,
  idade text, renda text, instagram text, escolaridade text, atuacao text,
  estado_civil text, tempo_wendell text, nicho text, tags text, utm_source text,
  utm_medium text, utm_campaign text, utm_content text, utm_term text, sck text,
  pageurl text, clint text, acao text, tipo_ingestao text, deleted integer
);
insert into snapshot_fixture(id,fixture_city,data_hora,produto,praca,nome,renda,utm_campaign,deleted)
select n,'protagon-joinville','2026-10-20T10:00:00-03:00','Protagon','Joinville',
  case when n%2=0 then 'Synthetic' else null end,'5.001 a 10.000','PRO-JV-035',
  case when n%2=0 then 0 else null end
from generate_series(1,1001) n;
do $$
declare city text; view_name text;
begin
  foreach city in array array['joinville','porto-alegre','goiania','sao-paulo'] loop
    view_name := 'leads_protagon_' || replace(city,'-','_');
    execute format('create temporary view %I as select id,data_hora,produto,praca,
      case when nome=''FAIL_TEST'' then (nome::integer)::text else nome end as nome,
      email,numero,idade,renda,instagram,escolaridade,atuacao,estado_civil,tempo_wendell,
      nicho,tags,utm_source,utm_medium,utm_campaign,utm_content,utm_term,sck,pageurl,clint,
      acao,tipo_ingestao,deleted from pg_temp.snapshot_fixture where fixture_city=%L',
      view_name,'protagon-'||city);
  end loop;
end;
$$;
