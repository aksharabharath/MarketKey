/**
 * Static regression checks (no browser).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ocrSrc = fs.readFileSync(path.join(root, "main code/photo-permit-ocr.js"), "utf8");
const scannerSrc = fs.readFileSync(path.join(root, "main code/photo-permit-scanner.js"), "utf8");
const indexSrc = fs.readFileSync(path.join(root, "main code/index.html"), "utf8");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const bannedFallbacks = ["Rivera Fresh Foods", "DEMO_EXTRACTION", "Run demo scan", "demo extraction"];
for (const phrase of bannedFallbacks) {
  assert(!scannerSrc.includes(phrase), `scanner must not contain ${phrase}`);
  assert(!ocrSrc.includes(phrase), `ocr engine must not contain ${phrase}`);
}

assert(!/\d{1,3}\s*%\s*confidence/i.test(ocrSrc + scannerSrc + indexSrc), "no fabricated % confidence");
assert(scannerSrc.includes("TESSERACT_VERSION = \"5.1.1\""), "pinned tesseract version");
const transferBlock = scannerSrc.match(/TRANSFER_TO_QUESTIONNAIRE\s*=\s*\{[\s\S]*?\n\s*\}/)?.[0] || "";
assert(transferBlock.includes("businessName"), "transfer map includes businessName");
assert(!transferBlock.includes("issueDate"), "transfer map must not include issueDate");
assert(!transferBlock.includes("FANumber"), "transfer map must not include FANumber");

assert(!scannerSrc.includes("localStorage.setItem"), "scanner must not persist to localStorage");
assert(!scannerSrc.includes("sessionStorage.setItem"), "scanner must not persist to sessionStorage");

console.log("Permit scanner static regression checks passed.");