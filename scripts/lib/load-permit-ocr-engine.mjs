import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function loadPermitOcrEngine() {
  const ocrPath = path.join(__dirname, "../../main code/photo-permit-ocr.js");
  const src = fs.readFileSync(ocrPath, "utf8");
  const sandbox = { globalThis: {} };
  sandbox.window = sandbox.globalThis;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.globalThis.PermitOcrEngine;
}