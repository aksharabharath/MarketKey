/**
 * Aggregates lightweight scanner rule checks + OCR suite.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function run(script) {
  const res = spawnSync(process.execPath, [path.join(root, "scripts", script)], {
    encoding: "utf8",
    stdio: "pipe"
  });
  if (res.status !== 0) {
    console.error(res.stdout || res.stderr);
    process.exit(res.status || 1);
  }
  process.stdout.write(res.stdout || "");
}

run("test-permit-scanner-static.mjs");
run("test-photo-permit-ocr.mjs");

console.log("Photo Permit Scanner unit checks passed.");