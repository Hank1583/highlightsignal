-- Synthetic fixture for MigrationChecksumTest -- never a real migration.
CREATE TABLE IF NOT EXISTS test_migration_marker_b (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
