# SQL execution order

Run these manually in the target MySQL database, one file at a time:

1. `000_preflight_inventory.sql` — read-only; save the results.
2. `010_v1_foundation.sql` — creates the V1 Workspace foundation tables.
3. `011_dashboard_decision_workflow.sql` — creates Recommendation, Decision, Task, and Task Step tables.
4. `012_business_outcomes.sql` — creates task-linked baseline and measured outcome storage.
5. `020_workspace_backfill_template.sql` — template only; replace all values,
   review it, and run once per existing owner. It intentionally rolls back.
6. `030_ga_connections_workspace_backfill_review.sql` — review queries; its
   write statements remain commented until the mapping is confirmed.

Back up the database before step 2. Do not run the backfill template unchanged.

## MySQL 5.6 compatibility

- Structured JSON values are stored in `TEXT`; PHP handles JSON encoding and decoding.
- `si/si_migration_aeo_metric_basis.sql` checks `information_schema` and safely
  skips the change when `basis` already exists.
- Workspace integration index columns are kept below the legacy InnoDB
  767-byte index limit when using `utf8mb4`.
- MySQL 5.6 parses but does not enforce `CHECK` constraints. Application
  validation remains required for SI module values.
