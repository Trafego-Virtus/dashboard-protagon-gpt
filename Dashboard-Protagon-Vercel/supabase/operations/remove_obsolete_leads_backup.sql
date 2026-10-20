-- Applied 2026-10-20 as migration 20261020180625_remove_obsolete_leads_backup_20261019.
-- User confirmed reconstruction from the official PostgreSQL and authorized removal.
-- Dependencies were checked immediately before execution. No CASCADE or source changes.
DROP TABLE import_leads_20261019.registros_leads_backup_20261019 RESTRICT;
