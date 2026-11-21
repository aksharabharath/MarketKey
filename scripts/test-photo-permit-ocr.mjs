/**
 * Rule-based classification & extraction tests (no browser OCR).
 * Run: npm run test:permit-ocr
 */

import { loadPermitOcrEngine } from "./lib/load-permit-ocr-engine.mjs";
import { classificationCases, extractionCases } from "./permit-ocr/extraction-cases.mjs";

const Engine = loadPermitOcrEngine();

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assertion failed");
}

function assertField(field, expect, label) {
  if (!field) throw new Error(`${label}: missing field result`);
  if (expect.value !== undefined) {
    assert(field.value === expect.value, `${label}: value expected ${expect.value} got ${field.value}`);
  }
  if (expect.valueIncludes) {
    for (const re of expect.valueIncludes) {
      assert(re.test(field.value), `${label}: ${field.value} missing ${re}`);
    }
  }
  if (expect.status !== undefined) {
    assert(field.status === expect.status, `${label}: status expected ${expect.status} got ${field.status}`);
  }
}

assert(Engine.isAllowedImage({ name: "x.png", type: "image/png", size: 1000 }));
assert(!Engine.isAllowedImage({ name: "x.pdf", type: "application/pdf", size: 1000 }));
assert(!Engine.isAllowedImage({ name: "huge.png", type: "image/png", size: Engine.MAX_FILE_BYTES + 1 }));
assert(!Engine.looksLikePhoneOrZip("TFF-2024-001234"));
assert(Engine.looksLikePhoneOrZip("510-555-0199"));
assert(Engine.parseDateToIso("May 10, 2024") === "2024-05-10");
assert(Engine.parseDateToIso("June 10, 2024") === "2024-06-10");
assert(Engine.parseDateToIso("2024-05-10") === "2024-05-10");

for (const testCase of classificationCases) {
  const result = Engine.classifyDocument(testCase.text);
  if (testCase.classify?.type) {
    assert(
      result.type === testCase.classify.type,
      `${testCase.name}: expected type ${testCase.classify.type} got ${result.type}`
    );
  }
}

for (const testCase of extractionCases) {
  const cls = Engine.classifyDocument(testCase.text);
  if (testCase.classify?.type) {
    assert(
      cls.type === testCase.classify.type,
      `${testCase.name}: expected class ${testCase.classify.type} got ${cls.type}`
    );
  }
  const { fields } = Engine.extractFields(testCase.text, cls);
  if (testCase.expectFields) {
    for (const [key, expect] of Object.entries(testCase.expectFields)) {
      assertField(fields[key], expect, `${testCase.name}.${key}`);
    }
  }
}

assert(
  Engine.validateReviewStep(
    { businessName: "Acme", issueDate: "2024-01-01", expirationDate: "" },
    { confirmIssue: false, confirmExpiration: false, confirmTransfer: true }
  ) === false
);
assert(
  Engine.validateReviewStep(
    { businessName: "Acme", issueDate: "", expirationDate: "" },
    { confirmIssue: false, confirmExpiration: false, confirmTransfer: true }
  )
);

const FOOD_FACILITY = `
County Environmental Health Department
FOOD FACILITY PERMIT
Permit Number: FF-99201
Business Name: Harbor Café
Issue Date: 01/02/2023
Expiration Date: 01/01/2024
`;
const ffClass = Engine.classifyDocument(FOOD_FACILITY);
assert(ffClass.type === "issued_food_facility");
const ffEx = Engine.extractFields(FOOD_FACILITY, ffClass);
assert(ffEx.fields.businessName.value === "Harbor Café");
assert(ffEx.fields.permitType.value.toLowerCase().includes("food facility"));

const CONFLICT = `
Temporary Food Facility Application
Health Permit Number: X-1
Issue Date: 03/01/2024
Submit application to Environmental Health.
`;
const conflictClass = Engine.classifyDocument(CONFLICT);
assert(conflictClass.type === "application" || conflictClass.type === "uncertain");

console.log(
  `Photo Permit OCR rule tests passed (${classificationCases.length} classification + ${extractionCases.length} extraction cases).`
);