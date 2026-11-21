/** @typedef {{ name: string, text: string, classify?: object, expectFields?: object, expectAmbiguous?: string[] }} ExtractionCase */

/** @type {ExtractionCase[]} */
export const classificationCases = [
  {
    name: "issued tff",
    text: `Alameda County Environmental Health\nTEMPORARY FOOD FACILITY PERMIT\nPermit Number: EH-1`,
    classify: { type: "issued_tff" }
  },
  {
    name: "application",
    text: `Temporary Food Facility Application\nSubmit this application to Environmental Health.\nApplication Date: 11/01/2025`,
    classify: { type: "application" }
  },
  {
    name: "unrelated email",
    text: `Inbox — Welcome\nClick unsubscribe to stop emails.`,
    classify: { type: "unrelated" }
  },
  {
    name: "uncertain minimal",
    text: "food permit",
    classify: { type: "uncertain" }
  }
];

/** @type {ExtractionCase[]} */
export const extractionCases = [
  {
    name: "dba noisy business name",
    text: `Environmental Health\nTEMPORARY FOOD FACILITY PERMIT\nPermit Number: TFF-1\nIssue Date: May 10, 2024\nExpiration Date: June 10, 2024\nBusiness Name (DBA): ): BAYVIEW ARTISAN TACOS Ve\nOwner/Operator: MARIA ESPINOZA`,
    classify: { type: "issued_tff" },
    expectFields: {
      businessName: { value: "BAYVIEW ARTISAN TACOS", status: "needs_review" },
      issueDate: { value: "2024-05-10" },
      expirationDate: { value: "2024-06-10" }
    }
  },
  {
    name: "plain business name",
    text: `Environmental Health Department\nHealth Permit\nBusiness Name: Joe's #1 Tacos & Co.\nPermit Number: EH-55-A`,
    expectFields: {
      businessName: { value: "Joe's #1 Tacos & Co." },
      permitNumber: { value: "EH-55-A" }
    }
  },
  {
    name: "business without dba",
    text: `County Environmental Health\nHealth Permit\nPermit Number: X-9\nBusiness Name: Sunrise Taco Truck\nIssue Date: 03/15/2024`,
    expectFields: {
      businessName: { value: "Sunrise Taco Truck", status: "high" }
    }
  },
  {
    name: "numeric dates",
    text: `Environmental Health\nHealth Permit Number: A-1\nIssue Date: 03/15/2024\nExpiration Date: 03/14/2025\nBusiness Name: Acme`,
    expectFields: {
      issueDate: { value: "2024-03-15" },
      expirationDate: { value: "2025-03-14" }
    }
  },
  {
    name: "iso date input",
    text: `Environmental Health\nIssue Date: 2024-05-10\nExpiration Date: 2025-06-01\nBusiness Name: Iso Co`,
    expectFields: {
      issueDate: { value: "2024-05-10" },
      expirationDate: { value: "2025-06-01" }
    }
  },
  {
    name: "expiration before issue in text",
    text: `Environmental Health\nTEMPORARY FOOD FACILITY PERMIT\nExpiration Date: June 10, 2024\nIssue Date: May 10, 2024\nPermit Number: TFF-2024-001234\nBusiness Name: Order Test LLC`,
    classify: { type: "issued_tff" },
    expectFields: {
      issueDate: { value: "2024-05-10" },
      expirationDate: { value: "2024-06-10" }
    }
  },
  {
    name: "event date trap",
    text: `Environmental Health\nPermit Number: EH-1\nBusiness Name: Ops LLC\nIssue Date: May 1, 2024\nExpiration Date: June 1, 2024\nEvent Operation Date: July 4, 2024`,
    expectFields: {
      issueDate: { value: "2024-05-01" },
      expirationDate: { value: "2024-06-01" }
    }
  },
  {
    name: "single event tff permit type",
    text: `Environmental Health\nTEMPORARY FOOD FACILITY PERMIT\nPermit Type: Single Event TFF\nBusiness Name: Fest LLC`,
    classify: { type: "issued_tff" },
    expectFields: {
      permitType: { value: "Single Event TFF", status: "high" }
    }
  },
  {
    name: "multi-line agency",
    text: `COUNTY OF ALAMEDA\nDEPARTMENT OF ENVIRONMENTAL HEALTH\nTEMPORARY FOOD FACILITY PERMIT\nPermit Number: T-1\nBusiness Name: Ag Test`,
    classify: { type: "issued_tff" },
    expectFields: {
      issuingAgency: { valueIncludes: [/county of alameda/i, /environmental health/i] }
    }
  },
  {
    name: "reject phone as permit",
    text: `Environmental Health\nPermit Number: 510-555-0199\nBusiness Name: Phone Trap`,
    expectFields: { permitNumber: { value: "" } }
  },
  {
    name: "reject zip as permit",
    text: `Environmental Health\nPermit Number: 94536\nBusiness Name: Zip Trap`,
    expectFields: { permitNumber: { value: "" } }
  },
  {
    name: "structured permit high confidence",
    text: `Environmental Health\nPermit Number: TFF-2024-001234\nBusiness Name: Struct Co`,
    expectFields: {
      permitNumber: { value: "TFF-2024-001234", status: "high" }
    }
  },
  {
    name: "missing fields",
    text: `Environmental Health\nHealth permit paperwork\nBusiness Name: Sparse LLC`,
    expectFields: {
      businessName: { value: "Sparse LLC" },
      permitNumber: { status: "not_detected" },
      issueDate: { status: "not_detected" },
      expirationDate: { status: "not_detected" }
    }
  },
  {
    name: "unrelated no fabricated fields",
    text: `Inbox — deals\nunsubscribe now`,
    classify: { type: "unrelated" },
    expectFields: {
      businessName: { value: "" },
      permitNumber: { value: "" }
    }
  }
];