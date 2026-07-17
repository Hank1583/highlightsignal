-- MySQL 5.6 compatible and safe to run more than once.
SET @basis_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'si_analysis_metrics'
    AND COLUMN_NAME = 'basis'
);

SET @basis_sql = IF(
  @basis_exists = 0,
  'ALTER TABLE si_analysis_metrics ADD COLUMN basis TEXT NULL AFTER note',
  'SELECT ''SKIP: si_analysis_metrics.basis already exists'' AS migration_status'
);

PREPARE basis_statement FROM @basis_sql;
EXECUTE basis_statement;
DEALLOCATE PREPARE basis_statement;
