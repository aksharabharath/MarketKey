import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: path.join(__dirname, "tests/permit-scanner"),
  testMatch: /.*\.spec\.mjs/,
  globalSetup: path.join(__dirname, "tests/permit-scanner/global-setup.mjs"),
  timeout: 240000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  webServer: {
    command: "python3 -m http.server 8765",
    cwd: path.join(__dirname, "main code"),
    url: "http://127.0.0.1:8765/index.html",
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  },
  use: {
    baseURL: "http://127.0.0.1:8765",
    headless: true,
    trace: "on-first-retry"
  }
});