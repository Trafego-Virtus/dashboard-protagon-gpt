// Isolated PostgreSQL integration checks, using only temporary synthetic records.
// Pipe to psql (ON_ERROR_STOP=1) or prepend to the recovery operation in one transaction.
import {readFileSync} from 'node:fs';
const original = readFileSync(new URL('../supabase/migrations/20261019180000_dashboard_lead_snapshots.sql', import.meta.url), 'utf8');
const recovery = readFileSync(new URL('../supabase/operations/recover_snapshot_refresh.sql', import.meta.url), 'utf8');
const tables = original.slice(original.indexOf('create table'), original.indexOf('-- Owner-only refresh:'));
const candidate = recovery.slice(0, recovery.indexOf('-- Remain paused')) +
  readFileSync(new URL('../supabase/operations/tolerate_snapshot_delay.sql', import.meta.url), 'utf8').replace("notify pgrst, 'reload schema';", '');
const isolate = sql => sql.replaceAll('public.', 'pg_temp.')
  .replaceAll('create table pg_temp.', 'create temporary table ')
  .replaceAll("'dashboard_snapshot:refresh'", "'dashboard_snapshot:selftest'")
  .replace(/^(revoke|grant) .*;\n/gm, '');
process.stdout.write(readFileSync(new URL('../tests/sql/snapshot-fixtures.sql', import.meta.url), 'utf8'));
process.stdout.write('\n' + isolate(tables + candidate));
process.stdout.write('\n' + readFileSync(new URL('../tests/sql/snapshot-assertions.sql', import.meta.url), 'utf8'));
