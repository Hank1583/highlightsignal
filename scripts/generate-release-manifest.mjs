// V12-03: produces one JSON record per promotion attempt -- the "version/
// tag/release artifact, deployment manifest" the task packet's own required
// work item #4 asks for. Ties together: the git commit being promoted, who
// triggered it, which target environment, and the CURRENT state of
// backend/sql/manual_apply_bookkeeping.sql (every migration this build
// expects to already be applied on the target host, with its checksum) --
// so a promotion record is traceable to an exact schema expectation, not
// just a frontend build.
//
// Usage: node scripts/generate-release-manifest.mjs --target staging --commit <sha> --actor <name> [--run-id <id>]

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function arg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  return index !== -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const target = arg("target");
const commit = arg("commit") ?? execFileSync("git", ["rev-parse", "HEAD"]).toString().trim();
const actor = arg("actor", "unknown");
const runId = arg("run-id", "local");

if (!target || !["staging", "production"].includes(target)) {
  console.error("Usage: --target staging|production [--commit <sha>] [--actor <name>] [--run-id <id>]");
  process.exit(1);
}

// Parse the migration checksum rows already recorded in
// manual_apply_bookkeeping.sql -- this is the SAME file the owner pastes
// into phpMyAdmin by hand; the manifest just reflects its current content,
// never a second source of truth for which migrations exist.
const bookkeepingPath = resolve("backend/sql/manual_apply_bookkeeping.sql");
const bookkeeping = readFileSync(bookkeepingPath, "utf8");
const migrationRowPattern = /\('(\d+)', '([^']+)', '([0-9a-f]{64})'/g;
const migrations = [];
for (const match of bookkeeping.matchAll(migrationRowPattern)) {
  migrations.push({ version: match[1], name: match[2], checksum: match[3] });
}

const manifest = {
  target,
  commit,
  actor,
  runId,
  generatedAt: new Date().toISOString(),
  frontend: {
    packageVersion: JSON.parse(readFileSync(resolve("package.json"), "utf8")).version,
  },
  backend: {
    expectedMigrations: migrations,
    migrationCount: migrations.length,
  },
  // The owner's own explicit sign-off, per required work item #3 ("手動步驟需
  // checksum、雙人/owner approval 與 evidence") -- this script cannot verify
  // approval happened; it only records the CLAIM the workflow_dispatch input
  // already required as a precondition to reaching this step.
  approvalClaim: "confirm_migrations_applied input was checked by the trigger",
};

mkdirSync(".release-manifest", { recursive: true });
const outputPath = resolve(`.release-manifest/${target}-${runId}.json`);
writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + "\n");

console.log(`Release manifest written to ${outputPath}`);
console.log(JSON.stringify(manifest, null, 2));
