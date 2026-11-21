import { test, expect } from "@playwright/test";
import {
  scrollToScanner,
  uploadFile,
  runOcrAndWait,
  getFieldState,
  assertNoScannerPersistence,
  fixture,
  completeReviewToConfirm,
  clickClear
} from "./helpers.mjs";

test.beforeAll(() => {
  if (process.env.SKIP_tesseract === "1") {
    throw new Error("SKIP_tesseract=1 is not supported — OCR tests must run or fail explicitly.");
  }
});

async function assertTesseractLoaded(page) {
  await page.waitForFunction(() => typeof window.permitScannerTestApi !== "undefined");
  const version = await page.evaluate(() => window.permitScannerTestApi.TESSERACT_VERSION);
  expect(version).toBe("5.1.1");
}

test("A — clear synthetic TFF permit: real Tesseract OCR + extraction", async ({ page }) => {
  await scrollToScanner(page);
  await assertTesseractLoaded(page);
  await uploadFile(page, fixture("clear-tff-permit.png"));
  await expect(page.locator("#permitScannerScanBtn")).toBeEnabled();
  await runOcrAndWait(page);
  const state = await getFieldState(page);
  expect(state.status).toMatch(/OCR complete/i);
  expect(state.unrecognized).toBe(false);
  expect(state.reviewHidden).toBeFalsy();
  expect(state.rawText.length).toBeGreaterThan(40);
  expect(state.banner).toMatch(/Temporary Food Facility|Issued health permit/i);
  expect(state.fields.businessName.value).toMatch(/HARBOR HILL TACOS/i);
  expect(state.fields.permitNumber.value).toMatch(/TFF-2025-000777|000777/);
  expect(state.fields.issueDate.value).toBe("2024-05-10");
  expect(state.fields.expirationDate.value).toBe("2024-06-10");
  expect(state.fields.permitType.value).toMatch(/Single Event TFF/i);
  expect(state.fields.issuingAgency.value).toMatch(/alameda/i);
  await assertNoScannerPersistence(page);
});

test("B — noisy permit: conservative status + manual correction", async ({ page }) => {
  await scrollToScanner(page);
  await uploadFile(page, fixture("noisy-tff-permit.png"));
  await runOcrAndWait(page);
  const state = await getFieldState(page);
  expect(state.status).toMatch(/OCR complete/i);
  expect(state.fields.businessName.disabled).toBe(false);
  const bn = state.fields.businessName.value;
  if (bn) {
    expect(state.fields.businessName.statusText).toMatch(/review|OCR|Not detected/i);
  }
  await page.locator("#permitScannerBusinessName").fill("RIDGE MARKET LLC FIXED");
  await expect(page.locator("#permitScannerBusinessName")).toHaveValue("RIDGE MARKET LLC FIXED");
  expect((await getFieldState(page)).fields.businessName.statusText).toMatch(
    /Corrected|entered|review|OCR/i
  );
});

test("C — unrelated email image", async ({ page }) => {
  await scrollToScanner(page);
  await uploadFile(page, fixture("unrelated-email.png"));
  await runOcrAndWait(page);
  const state = await getFieldState(page);
  expect(state.status).toMatch(/could not be recognized|No readable/i);
  expect(state.unrecognized).toBe(true);
  expect(state.fields.businessName.value).toBe("");
  expect(state.fields.permitNumber.value).toBe("");
  await expect(page.locator("#permitScannerContinueBtn")).toBeDisabled();
});

test("D — TFF application image", async ({ page }) => {
  await scrollToScanner(page);
  await uploadFile(page, fixture("tff-application.png"));
  await runOcrAndWait(page);
  const state = await getFieldState(page);
  expect(state.status).toMatch(/application/i);
  expect(state.banner).toMatch(/application/i);
  expect(state.banner).toMatch(/not an issued permit|application form/i);
  const cls = await page.evaluate(() => {
    const raw = document.getElementById("permitScannerRawText")?.textContent || "";
    return window.PermitOcrEngine.classifyDocument(raw).type;
  });
  expect(cls).toBe("application");
});

test("E — invalid uploads show errors and recover", async ({ page }) => {
  await scrollToScanner(page);
  await uploadFile(page, fixture("invalid.pdf"));
  await expect(page.locator("#permitScannerStatus")).toContainText(/JPG|PNG|WebP|PDF|Unsupported/i);
  await expect(page.locator("#permitScannerScanBtn")).toBeDisabled();
  await page.locator("#permitScannerClearBtn").click();
  await uploadFile(page, fixture("oversized.png"));
  await expect(page.locator("#permitScannerStatus")).toContainText(/too large|12/i);
  await page.locator("#permitScannerClearBtn").click();
  await uploadFile(page, fixture("invalid.txt"));
  await expect(page.locator("#permitScannerStatus")).toContainText(/Unsupported|JPG/i);
});

test("F — navigation, edits persist, replace image, reset", async ({ page }) => {
  await scrollToScanner(page);
  await uploadFile(page, fixture("clear-tff-permit.png"));
  await runOcrAndWait(page);
  const firstBiz = await page.locator("#permitScannerBusinessName").inputValue();
  expect(firstBiz.length).toBeGreaterThan(0);
  await page.locator("#permitScannerBusinessName").fill("EDITED NAV LLC");
  await completeReviewToConfirm(page);
  await page.locator("#permitScannerBackToReview").click();
  await expect(page.locator("#permitScannerBusinessName")).toHaveValue("EDITED NAV LLC");
  await completeReviewToConfirm(page);
  await expect(page.locator("#permitScannerConfirmList")).toContainText("EDITED NAV LLC");
  await page.locator("#permitScannerBackToReview").click();
  await clickClear(page);
  await uploadFile(page, fixture("clear-tff-permit.png"));
  await runOcrAndWait(page);
  const replaced = await page.locator("#permitScannerBusinessName").inputValue();
  expect(replaced).not.toBe("EDITED NAV LLC");
  expect(replaced).toMatch(/HARBOR HILL TACOS/i);
  await clickClear(page);
  await expect(page.locator("#permitScannerStatus")).toHaveText("");
  await expect(page.locator("#permitScannerPreview")).toBeHidden();
});