import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "fixtures");

const DOCUMENTS = {
  "clear-tff-permit.png": {
    width: 1100,
    height: 850,
    fontSize: 30,
    lineHeight: 42,
    noise: false,
    rotateDeg: 0,
    lines: [
      "COUNTY OF ALAMEDA",
      "DEPARTMENT OF ENVIRONMENTAL HEALTH",
      "TEMPORARY FOOD FACILITY PERMIT",
      "",
      "Permit Number: TFF-2025-000777",
      "Issue Date: May 10, 2024",
      "Expiration Date: June 10, 2024",
      "Permit Type: Single Event TFF",
      "Business Name: HARBOR HILL TACOS LLC"
    ]
  },
  "noisy-tff-permit.png": {
    width: 1100,
    height: 850,
    fontSize: 22,
    lineHeight: 34,
    noise: true,
    rotateDeg: -3,
    lines: [
      "COUNTY OF ALAMEDA",
      "DEPARTMENT OF ENVIRONMENTAL HEALTH",
      "TEMPORARY FOOD FACILITY PERMIT",
      "Permit Number: TFF-2025-000888",
      "Issue Date: May 10, 2024",
      "Expiration Date: June 10, 2024",
      "Business Name (DBA): ): RIDGE MARKET LLC Ve",
      "Owner/Operator: FICTIVE PERSON"
    ]
  },
  "unrelated-email.png": {
    width: 900,
    height: 500,
    fontSize: 32,
    lineHeight: 44,
    noise: false,
    rotateDeg: 0,
    lines: ["Inbox — Flash sale", "Click unsubscribe to stop promotional emails."]
  },
  "tff-application.png": {
    width: 1000,
    height: 750,
    fontSize: 28,
    lineHeight: 40,
    noise: false,
    rotateDeg: 0,
    lines: [
      "Temporary Food Facility Application",
      "Alameda County Environmental Health",
      "Application Date: 11/01/2025",
      "Applicant Name: Jamie Lee",
      "Submit this application to Environmental Health."
    ]
  }
};

async function renderPng(page, spec) {
  const base64 = await page.evaluate((s) => {
    const canvas = document.createElement("canvas");
    canvas.width = s.width;
    canvas.height = s.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, s.width, s.height);
    if (s.noise) {
      ctx.strokeStyle = "rgba(200,200,200,0.35)";
      for (let i = 0; i < 40; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * s.width, Math.random() * s.height);
        ctx.lineTo(Math.random() * s.width, Math.random() * s.height);
        ctx.stroke();
      }
    }
    ctx.save();
    ctx.translate(s.width / 2, s.height / 2);
    ctx.rotate((s.rotateDeg * Math.PI) / 180);
    ctx.translate(-s.width / 2, -s.height / 2);
    ctx.fillStyle = "#111111";
    ctx.font = `bold ${s.fontSize}px Georgia, serif`;
    let y = 72;
    for (const line of s.lines) {
      ctx.fillText(line, 48, y);
      y += s.lineHeight;
    }
    ctx.restore();
    const data = canvas.toDataURL("image/png");
    return data.split(",")[1];
  }, spec);
  return Buffer.from(base64, "base64");
}

export default async function globalSetup() {
  fs.mkdirSync(fixturesDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [filename, spec] of Object.entries(DOCUMENTS)) {
    const buf = await renderPng(page, spec);
    fs.writeFileSync(path.join(fixturesDir, filename), buf);
  }
  fs.writeFileSync(path.join(fixturesDir, "invalid.pdf"), Buffer.from("%PDF-1.4 fake permit\n"));
  fs.writeFileSync(path.join(fixturesDir, "invalid.txt"), Buffer.from("not an image"));
  const oversize = Buffer.alloc(Engine_MAX_BYTES() + 1024, 0x89);
  oversize.write("PNG", 1);
  fs.writeFileSync(path.join(fixturesDir, "oversized.png"), oversize);
  await browser.close();
  console.log(`Generated ${Object.keys(DOCUMENTS).length + 3} permit-scanner fixtures.`);
}

function Engine_MAX_BYTES() {
  return 12 * 1024 * 1024;
}