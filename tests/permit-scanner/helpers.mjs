import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const fixturesDir = path.join(__dirname, "fixtures");

export function fixture(name) {
  return path.join(fixturesDir, name);
}

export async function scrollToScanner(page) {
  await page.goto("/index.html");
  await page.locator("#permitScanner").scrollIntoViewIfNeeded();
}

export async function uploadFile(page, filePath) {
  await page.locator("#permitScannerFile").setInputFiles(filePath);
}

export async function showUploadStep(page) {
  await page.evaluate(() => {
    document.querySelectorAll("[data-scanner-step]").forEach((panel) => {
      panel.hidden = panel.dataset.scannerStep !== "upload";
    });
  });
}

export async function clickClear(page) {
  await showUploadStep(page);
  await page.locator("#permitScannerClearBtn").click();
}

export async function runOcrAndWait(page, { timeout = 180000 } = {}) {
  await page.locator("#permitScannerScanBtn").click();
  await page.waitForFunction(
    () => {
      const status = document.getElementById("permitScannerStatus")?.textContent || "";
      const extractVisible =
        document.querySelector('[data-scanner-step="extract"]') &&
        !document.querySelector('[data-scanner-step="extract"]').hidden;
      const unrecognized =
        document.getElementById("permitScannerUnrecognized") &&
        !document.getElementById("permitScannerUnrecognized").hidden;
      const scanning = status.includes("…") || /Running OCR|Loading OCR|Preparing image/i.test(status);
      if (scanning) return false;
      if (/OCR complete|could not be recognized|No readable|failed|application form/i.test(status)) {
        return true;
      }
      if (unrecognized && status.length > 0) return true;
      if (extractVisible && document.getElementById("permitScannerBusinessName")?.disabled === false) {
        return status.length > 0;
      }
      return false;
    },
    { timeout }
  );
}

export async function getFieldState(page) {
  return page.evaluate(() => {
    const keys = [
      "permitNumber",
      "businessName",
      "issueDate",
      "expirationDate",
      "permitType",
      "issuingAgency"
    ];
    const fields = {};
    const dom = {
      permitNumber: "permitScannerPermitNumber",
      businessName: "permitScannerBusinessName",
      issueDate: "permitScannerIssueDate",
      expirationDate: "permitScannerExpirationDate",
      permitType: "permitScannerPermitType",
      issuingAgency: "permitScannerIssuingAgency"
    };
    for (const key of keys) {
      const el = document.getElementById(dom[key]);
      const statusEl = document.querySelector(`[data-field-status="${key}"]`);
      fields[key] = {
        value: el?.value || "",
        disabled: el?.disabled ?? true,
        statusText: statusEl?.textContent || ""
      };
    }
    return {
      fields,
      rawText: document.getElementById("permitScannerRawText")?.textContent || "",
      status: document.getElementById("permitScannerStatus")?.textContent || "",
      banner: document.getElementById("permitScannerClassBanner")?.textContent || "",
      unrecognized: !document.getElementById("permitScannerUnrecognized")?.hidden,
      reviewHidden: document.getElementById("permitScannerReviewFields")?.hidden
    };
  });
}

export async function assertNoScannerPersistence(page) {
  const storage = await page.evaluate(() => ({
    localStorageKeys: [...Object.keys(localStorage)],
    sessionStorageKeys: [...Object.keys(sessionStorage)]
  }));
  const combined = storage.localStorageKeys.length + storage.sessionStorageKeys.length;
  if (combined > 0) {
    throw new Error(`unexpected storage keys: ${JSON.stringify(storage)}`);
  }
}

export async function completeReviewToConfirm(page, { businessName, confirmDates = true } = {}) {
  if (businessName) {
    await page.locator("#permitScannerBusinessName").fill(businessName);
  }
  const issue = await page.locator("#permitScannerIssueDate").inputValue();
  const exp = await page.locator("#permitScannerExpirationDate").inputValue();
  if (confirmDates && issue) {
    const issueCheck = page.locator("#permitScannerConfirmIssue").locator("xpath=ancestor::label");
    if (await issueCheck.isVisible()) await page.locator("#permitScannerConfirmIssue").check();
  }
  if (confirmDates && exp) {
    const expCheck = page.locator("#permitScannerConfirmExpiration").locator("xpath=ancestor::label");
    if (await expCheck.isVisible()) await page.locator("#permitScannerConfirmExpiration").check();
  }
  await page.locator("#permitScannerConfirmTransfer").check();
  await expectContinueEnabled(page);
  await page.locator("#permitScannerContinueBtn").click();
  await page.waitForFunction(
    () => !document.querySelector('[data-scanner-step="confirm"]')?.hidden
  );
}

export async function expectContinueEnabled(page) {
  await page.waitForFunction(() => !document.getElementById("permitScannerContinueBtn")?.disabled);
}