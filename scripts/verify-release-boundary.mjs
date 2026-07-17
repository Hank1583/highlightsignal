import { execFileSync } from "node:child_process";

const arguments_ = process.argv.slice(2);
const selfTest = arguments_.includes("--self-test");
const fixtures = arguments_.filter((value) => value !== "--self-test");
const allowedExamples = new Set([".env.example", "backend/api/.env.example"]);
function isForbidden(rawPath) {
  const path = rawPath.replaceAll("\\", "/");
  const basename = path.split("/").at(-1)?.toLowerCase() ?? "";

  if ((basename === ".env" || basename.startsWith(".env.")) && !allowedExamples.has(path)) {
    return true;
  }

  if (/^(backend\/private|backend\/api\/(storage|vendor)|\.next|\.open-next|out|build)\//.test(path)) {
    return true;
  }

  if (/\.(pem|key)$/i.test(path)) return true;
  if (/\.json$/i.test(path) && /(credential|service[-_]?account)/i.test(path)) return true;
  if (path === "backend/api/ga/report/config.php") return true;

  return false;
}

if (selfTest) {
  const forbiddenFixtures = [
    "backend/private/.env",
    ".open-next/worker.js",
    "backend/api/google-service-account.json",
    "backend/api/ga/report/config.php",
  ];
  const allowedFixtures = [".env.example", "backend/api/.env.example", "wrangler.jsonc"];
  const failed = forbiddenFixtures.filter((path) => !isForbidden(path))
    .concat(allowedFixtures.filter((path) => isForbidden(path)));
  if (failed.length > 0) {
    console.error(`Release boundary self-test failed: ${failed.join(", ")}`);
    process.exit(1);
  }
  console.log("Release boundary negative fixtures PASS.");
  process.exit(0);
}

const tracked = fixtures.length > 0
  ? fixtures
  : execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
      .split("\0")
      .filter(Boolean);
const forbidden = tracked.filter(isForbidden);

if (forbidden.length > 0) {
  console.error("Forbidden Release files are tracked:");
  for (const path of forbidden) console.error(`- ${path}`);
  process.exit(1);
}

console.log(`Release boundary PASS (${tracked.length} tracked files checked).`);
