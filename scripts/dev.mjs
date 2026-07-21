#!/usr/bin/env node

// Node's `--env-file` CLI flag propagates into NODE_OPTIONS for any child
// process Next.js's dev server forks, and Next 16's dev CLI rejects that
// combination outright ("--env-file= is not allowed in NODE_OPTIONS"). Loading
// the env file with plain dotenv.config() instead avoids execArgv/NODE_OPTIONS
// entirely -- it just populates process.env in this process, which children
// inherit as normal environment variables.
import { config } from "dotenv";

config({ path: "backend/private/frontend.env" });

if (!process.env.NEXT_DISABLE_TURBOPACK) {
  process.env.NEXT_DISABLE_TURBOPACK = "1";
}

process.argv = [process.argv[0], process.argv[1], "dev"];
await import("next/dist/bin/next");
