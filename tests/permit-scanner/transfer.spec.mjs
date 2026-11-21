import { test, expect } from "@playwright/test";
import {
  scrollToScanner,
  uploadFile,
  runOcrAndWait,
  fixture,
  completeReviewToConfirm
} from "./helpers.mjs";

const PREPOP = {
  todaysDate: "2025-01-15",
  StartDate: "2025-06-01",
  EndDate: "2025-06-02",
  OwnerName: "Keep Owner",
  FANumber: "FA-KEEP-99",
  BusinessName: "Original Biz Name",
  EventName: "Keep Event"
};

async function prepQuestionnaire(page) {
  await scrollToScanner(page);
  await page.evaluate((data) => {
    appState.path = "tff";
    appState.formData = { ...data };
  }, PREPOP);
}

async function readFormState(page) {
  return page.evaluate(() => ({ ...appState.formData }));
}

test("transfer — only Business Name updates; other answers preserved", async ({ page }) => {
  await prepQuestionnaire(page);
  await uploadFile(page, fixture("clear-tff-permit.png"));
  await runOcrAndWait(page);
  const transferName = "Transferred Harbor LLC";
  await page.locator("#permitScannerBusinessName").fill(transferName);
  const permitBefore = await page.locator("#permitScannerPermitNumber").inputValue();
  await completeReviewToConfirm(page);
  await page.locator("#permitScannerTransferBtn").click();
  await page.waitForFunction(() => appState.formData.BusinessName !== "Original Biz Name");
  const after = await readFormState(page);
  expect(after.BusinessName).toBe(transferName);
  expect(after.todaysDate).toBe(PREPOP.todaysDate);
  expect(after.StartDate).toBe(PREPOP.StartDate);
  expect(after.EndDate).toBe(PREPOP.EndDate);
  expect(after.OwnerName).toBe(PREPOP.OwnerName);
  expect(after.FANumber).toBe(PREPOP.FANumber);
  expect(after.EventName).toBe(PREPOP.EventName);
  const bizInput = page.locator("#businessName");
  if (await bizInput.count()) {
    await expect(bizInput).toHaveValue(transferName);
  }
  expect(permitBefore.length).toBeGreaterThan(0);
  expect(after.FANumber).toBe(PREPOP.FANumber);
});

test("transfer — idempotent: second transfer disabled", async ({ page }) => {
  await prepQuestionnaire(page);
  await uploadFile(page, fixture("clear-tff-permit.png"));
  await runOcrAndWait(page);
  await page.locator("#permitScannerBusinessName").fill("Once Only LLC");
  await completeReviewToConfirm(page);
  await page.locator("#permitScannerTransferBtn").click();
  await page.waitForTimeout(600);
  await expect(page.locator("#permitScannerTransferBtn")).toBeDisabled();
  const once = await readFormState(page);
  await page.locator("#permitScannerTransferBtn").click({ force: true }).catch(() => {});
  const twice = await readFormState(page);
  expect(twice.BusinessName).toBe(once.BusinessName);
});

test("transfer — blocked without confirmation checklist", async ({ page }) => {
  await prepQuestionnaire(page);
  await uploadFile(page, fixture("clear-tff-permit.png"));
  await runOcrAndWait(page);
  await page.locator("#permitScannerBusinessName").fill("No Confirm LLC");
  await expect(page.locator("#permitScannerContinueBtn")).toBeDisabled();
  const before = await readFormState(page);
  expect(before.BusinessName).toBe(PREPOP.BusinessName);
});

test("transfer — empty business name does not overwrite questionnaire", async ({ page }) => {
  await prepQuestionnaire(page);
  await uploadFile(page, fixture("unrelated-email.png"));
  await runOcrAndWait(page);
  const before = await readFormState(page);
  await expect(page.locator("#permitScannerContinueBtn")).toBeDisabled();
  expect(before.BusinessName).toBe(PREPOP.BusinessName);
});