-- Synthetic fixture for MigrationChecksumTest -- never a real migration,
-- never applied to the real schema. Version 900+ deliberately out of range
-- of any real backend/sql/migrations/*.sql file.
CREATE TABLE IF NOT EXISTS test_migration_marker_a (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
