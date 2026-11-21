/**
 * Rule-based permit document classification and field extraction (browser + test VM).
 * No fake defaults — missing values stay empty.
 */
(function permitOcrEngine(root) {
  const FIELD_KEYS = [
    "businessName",
    "permitNumber",
    "issueDate",
    "expirationDate",
    "permitType",
    "issuingAgency"
  ];

  const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
  const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
  const MAX_FILE_BYTES = 12 * 1024 * 1024;

  const PHONE_RE = /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;
  const ZIP_RE = /\b\d{5}(?:-\d{4})?\b/;

  function isAllowedImage(file) {
    if (!file) return false;
    if (file.size > MAX_FILE_BYTES) return false;
    if (file.type && ALLOWED_IMAGE_TYPES.has(file.type)) return true;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    return ALLOWED_EXTENSIONS.has(ext);
  }

  function fileSizeError(file) {
    if (file?.size > MAX_FILE_BYTES) {
      return `Image is too large (max ${Math.round(MAX_FILE_BYTES / (1024 * 1024))} MB).`;
    }
    return null;
  }

  function normalizeText(text) {
    return String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .trim();
  }

  const MONTH_BY_NAME = {
    january: 1,
    jan: 1,
    february: 2,
    feb: 2,
    march: 3,
    mar: 3,
    april: 4,
    apr: 4,
    may: 5,
    june: 6,
    jun: 6,
    july: 7,
    jul: 7,
    august: 8,
    aug: 8,
    september: 9,
    sept: 9,
    sep: 9,
    october: 10,
    oct: 10,
    november: 11,
    nov: 11,
    december: 12,
    dec: 12
  };

  const FIELD_LABEL_STOP =
    "(?:owner\\s*\\/\\s*operator|business\\s+name|permit\\s+number|permit\\s+type|issue\\s+date|expiration\\s+date|expir(?:ation|es)\\s+date|application\\s+date|event\\s+(?:date|start|end)|valid\\s+through|applicant\\s+name)";

  function parseDateToIso(raw) {
    if (!raw) return "";
    const s = String(raw)
      .trim()
      .replace(/^[\s:;|]+/, "")
      .replace(/[\s,;|]+$/, "");
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return s;

    const mdy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (mdy) {
      let year = parseInt(mdy[3], 10);
      if (year < 100) year += 2000;
      const month = String(mdy[1]).padStart(2, "0");
      const day = String(mdy[2]).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    const named = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
    if (named) {
      const monthNum = MONTH_BY_NAME[named[1].toLowerCase()];
      if (monthNum) {
        const year = named[3];
        const day = String(named[2]).padStart(2, "0");
        const month = String(monthNum).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    }

    const ymdNamed = s.match(/^(\d{4})\s+([A-Za-z]+)\s+(\d{1,2})$/);
    if (ymdNamed) {
      const monthNum = MONTH_BY_NAME[ymdNamed[2].toLowerCase()];
      if (monthNum) {
        const day = String(ymdNamed[3]).padStart(2, "0");
        const month = String(monthNum).padStart(2, "0");
        return `${ymdNamed[1]}-${month}-${day}`;
      }
    }
    return "";
  }

  function looksLikePhoneOrZip(value) {
    const v = String(value || "").trim();
    if (!v) return false;
    if (PHONE_RE.test(v)) return true;
    if (/^\d{5}(?:-\d{4})?$/.test(v)) return true;
    if (ZIP_RE.test(v) && !/[A-Za-z]/.test(v) && v.replace(/\D/g, "").length <= 9) {
      return true;
    }
    return false;
  }

  function scoreSignals(text, patterns) {
    let score = 0;
    const hits = [];
    patterns.forEach(({ re, weight, label }) => {
      if (re.test(text)) {
        score += weight;
        hits.push(label);
      }
    });
    return { score, hits };
  }

  const SIGNALS = {
    healthAgency: [
      { re: /environmental\s+health/i, weight: 3, label: "environmental health" },
      { re: /health\s+department/i, weight: 3, label: "health department" },
      { re: /department\s+of\s+(?:public\s+)?health/i, weight: 2, label: "department of health" },
      { re: /alameda\s+county/i, weight: 2, label: "Alameda County" }
    ],
    issuedPermit: [
      { re: /health\s+permit/i, weight: 3, label: "health permit" },
      { re: /food\s+facility\s+permit/i, weight: 3, label: "food facility permit" },
      { re: /permit\s+(?:#|no\.?|number)/i, weight: 2, label: "permit number label" },
      { re: /(?:issue|issued)\s+date/i, weight: 2, label: "issue date" },
      { re: /(?:expir(?:ation|es)|valid\s+through)/i, weight: 2, label: "expiration" },
      { re: /permit\s+issued/i, weight: 2, label: "permit issued" }
    ],
    tff: [
      { re: /temporary\s+food\s+facility/i, weight: 4, label: "temporary food facility" },
      { re: /\bTFF\b/, weight: 3, label: "TFF" }
    ],
    application: [
      { re: /application\s+for/i, weight: 3, label: "application for" },
      { re: /applicant\s+name/i, weight: 2, label: "applicant name" },
      { re: /submit\s+(?:this\s+)?application/i, weight: 3, label: "submit application" },
      { re: /application\s+date/i, weight: 2, label: "application date" },
      { re: /temporary\s+food\s+facility\s+application/i, weight: 4, label: "TFF application" }
    ],
    unrelated: [
      { re: /\binbox\b/i, weight: 2, label: "email inbox" },
      { re: /unsubscribe/i, weight: 3, label: "unsubscribe" },
      { re: /selfie|vacation|sunset/i, weight: 3, label: "non-document photo" }
    ]
  };

  function classifyDocument(text) {
    const body = normalizeText(text);
    if (!body || body.length < 12) {
      return {
        type: "uncertain",
        label: "Document type uncertain",
        reason: "OCR returned too little text to classify this document.",
        missingSignals: ["health department", "permit number", "issue or expiration date"],
        hits: []
      };
    }

    const health = scoreSignals(body, SIGNALS.healthAgency);
    const issued = scoreSignals(body, SIGNALS.issuedPermit);
    const tff = scoreSignals(body, SIGNALS.tff);
    const application = scoreSignals(body, SIGNALS.application);
    const unrelated = scoreSignals(body, SIGNALS.unrelated);

    const allHits = [
      ...health.hits,
      ...issued.hits,
      ...tff.hits,
      ...application.hits
    ];

    if (unrelated.score >= 3 && health.score + issued.score < 3) {
      return {
        type: "unrelated",
        label: "Unrelated or unrecognized document",
        reason: "Text looks like a non-permit image or unrelated content.",
        missingSignals: ["environmental health", "health permit", "permit number"],
        hits: unrelated.hits
      };
    }

    const hasExpirationSignal = /expir(?:ation|es)|valid\s+through/i.test(body);
    const strongApplicationForm =
      /\btemporary\s+food\s+facility\s+application\b/i.test(body) ||
      (/\bapplication\b/i.test(body) && /\bsubmit\s+(?:this\s+)?application/i.test(body));

    if (application.score >= 4 && application.score >= issued.score + 2) {
      return {
        type: "application",
        label: "Food permit application",
        reason:
          "Language matches an application form (not an issued permit). Do not treat this as proof of an approved permit.",
        missingSignals: [],
        hits: [...application.hits, ...allHits]
      };
    }

    if (strongApplicationForm && application.score >= 4 && !hasExpirationSignal) {
      return {
        type: "application",
        label: "Food permit application",
        reason:
          "This reads as an application form (submit/application language without issued-permit expiration signals).",
        missingSignals: ["expiration or valid-through date on an issued permit"],
        hits: [...application.hits, ...allHits]
      };
    }

    if (application.score >= 4 && issued.score >= 4 && hasExpirationSignal) {
      return {
        type: "uncertain",
        label: "Document type uncertain",
        reason: "Mixed application and issued-permit signals — manual review required.",
        missingSignals: ["clear issued-permit language"],
        hits: allHits
      };
    }

    const permitScore = health.score + issued.score + tff.score;
    if (permitScore < 4) {
      return {
        type: "uncertain",
        label: "Document type uncertain",
        reason: "Not enough health-permit signals to classify this document confidently.",
        missingSignals: [
          health.score < 2 ? "environmental health / health department" : null,
          issued.score < 2 ? "permit number or issue/expiration dates" : null,
          tff.score < 1 ? "food facility / TFF wording" : null
        ].filter(Boolean),
        hits: allHits
      };
    }

    if (application.score >= 3 && issued.score < 3) {
      return {
        type: "uncertain",
        label: "Document type uncertain",
        reason: "Mixed application and permit signals — manual review required.",
        missingSignals: ["clear issued-permit language"],
        hits: allHits
      };
    }

    let subtype = "issued_health_permit";
    let label = "Issued health permit";

    if (tff.score >= 4) {
      subtype = "issued_tff";
      label = "Temporary Food Facility permit";
    } else if (/food\s+facility\s+permit/i.test(body)) {
      subtype = "issued_food_facility";
      label = "Food facility permit";
    }

    return {
      type: subtype,
      label,
      reason: "Rule-based match on health department and permit terminology.",
      missingSignals: [],
      hits: allHits
    };
  }

  function trimBeforeNextLabel(fragment) {
    if (!fragment) return "";
    const stop = new RegExp(`\\s+${FIELD_LABEL_STOP}\\s*[:#\\-]?`, "i");
    const cut = fragment.split(stop)[0] ?? fragment;
    return cut.replace(/\s{2,}/g, " ").trim();
  }

  function extractLabeledValue(text, labels, options = {}) {
    const body = normalizeText(text);
    const maxLen = options.maxLen || 80;
    for (const label of labels) {
      const re = new RegExp(
        `${label}(?:\\s*\\([^)]+\\))?\\s*[:#\\-]?\\s*([^\\n\\r]{1,${maxLen}})`,
        "i"
      );
      const match = body.match(re);
      if (match) {
        const raw = match[1].replace(/\s{2,}/g, " ").trim();
        return options.stopAtNextLabel === false ? raw : trimBeforeNextLabel(raw);
      }
    }
    return "";
  }

  function cleanBusinessName(raw) {
    let s = String(raw || "").trim();
    if (!s) return "";
    s = s.replace(/^\(dba\)\s*:?\s*/i, "");
    s = s.replace(/^[\s:)\-|]+/, "");
    s = s.replace(/\bowner\s*\/\s*operator\b[\s\S]*$/i, "");
    s = trimBeforeNextLabel(s);
    s = s.replace(/\s+[A-Za-z]{1,2}\s*$/g, "").trim();
    return s;
  }

  function normalizePermitNumberToken(permitRaw) {
    const raw = String(permitRaw || "").trim();
    if (!raw || looksLikePhoneOrZip(raw)) return "";

    const structured =
      raw.match(/\b[A-Z]{2,8}-\d{4}-\d{3,10}\b/i) ||
      raw.match(/\b[A-Z]{2,8}-\d{4}-\d+\b/i);
    if (structured) {
      const token = structured[0].toUpperCase();
      return looksLikePhoneOrZip(token) ? "" : token;
    }

    const generic = raw.match(/\b[A-Z0-9][A-Z0-9\-\/]{2,24}\b/i);
    if (generic && !looksLikePhoneOrZip(generic[0])) {
      return generic[0].replace(/\s+/g, "");
    }
    return "";
  }

  function permitNumberConfidence(token) {
    if (!token) return "not_detected";
    if (/^[A-Z]{2,8}-\d{4}-\d{3,10}$/i.test(token)) return "high";
    if (/^[A-Z0-9][A-Z0-9\-\/]{3,}$/i.test(token)) return "high";
    return "needs_review";
  }

  function extractIssuingAgency(text) {
    const raw = String(text || "").replace(/\r\n/g, "\n");
    const flat = normalizeText(raw);

    const countyDept = flat.match(
      /\b(?:county\s+of\s+)?alameda(?:\s+county)?\s+department\s+of\s+environmental\s+health\b/i
    );
    if (countyDept) {
      return titleCaseAgency(countyDept[0]);
    }

    const countyOf = flat.match(/\bcounty\s+of\s+[a-z]+(?:\s+county)?\b/i);
    const deptEh = flat.match(/\bdepartment\s+of\s+environmental\s+health\b/i);
    if (countyOf && deptEh && !/\bdepartment\b/i.test(countyOf[0])) {
      return titleCaseAgency(`${countyOf[0]} ${deptEh[0]}`);
    }

    const lines = raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !looksLikePhoneOrZip(line) && !/\b\d{5}\b/.test(line));
    const header = [];
    for (let i = 0; i < Math.min(lines.length, 6); i++) {
      if (
        /county\s+of|department\s+of|environmental\s+health|health\s+department/i.test(lines[i])
      ) {
        header.push(lines[i]);
        if (
          i + 1 < lines.length &&
          /department|environmental|health/i.test(lines[i + 1]) &&
          !/permit|business|owner/i.test(lines[i + 1])
        ) {
          header.push(lines[i + 1]);
        }
        if (header.length >= 2) break;
      }
    }
    if (header.length) {
      return titleCaseAgency(header.join(" ").replace(/\s+/g, " "));
    }

    const ehOnly = flat.match(/\benvironmental\s+health(?:\s+department)?\b/i);
    return ehOnly ? titleCaseAgency(ehOnly[0]) : "";
  }

  function titleCaseAgency(name) {
    return String(name || "").replace(/\s+/g, " ").trim();
  }

  function extractPermitTypeValue(body, classification) {
    const typeRaw = extractLabeledValue(body, ["permit\\s+type"], { maxLen: 64 });
    if (typeRaw) {
      const cleaned = trimBeforeNextLabel(typeRaw).replace(/\s+/g, " ").trim();
      if (cleaned.length >= 3) {
        const status =
          /single\s+event\s+tff|temporary\s+food\s+facility|\btff\b/i.test(cleaned)
            ? "high"
            : "needs_review";
        return { value: cleaned, status, source: typeRaw };
      }
    }
    if (classification.type === "issued_tff" || /\btemporary\s+food\s+facility\b/i.test(body)) {
      if (/\bsingle\s+event\s+tff\b/i.test(body)) {
        return {
          value: "Single Event TFF",
          status: "needs_review",
          source: "Single Event TFF (in document text)"
        };
      }
      return {
        value: "Temporary Food Facility (TFF)",
        status: "needs_review",
        source: "Temporary Food Facility"
      };
    }
    if (/food\s+facility\s+permit/i.test(body)) {
      return {
        value: "Food facility permit",
        status: "needs_review",
        source: "Food facility permit"
      };
    }
    return null;
  }

  function fieldResult(value, status, source) {
    return {
      value: value || "",
      status,
      source: source || ""
    };
  }

  function extractFields(text, classification) {
    const empty = FIELD_KEYS.reduce((acc, key) => {
      acc[key] = fieldResult("", "not_detected", "");
      return acc;
    }, {});

    if (!classification || classification.type === "unrelated") {
      return { fields: empty, ambiguousDates: [] };
    }

    const body = normalizeText(text);
    const fields = { ...empty };

    const businessRaw = extractLabeledValue(body, [
      "business\\s+name",
      "establishment\\s+name",
      "facility\\s+name",
      "name\\s+of\\s+business",
      "operator\\s+name"
    ]);
    if (businessRaw) {
      const clean = cleanBusinessName(businessRaw.replace(/[|]/g, " "));
      if (clean.length >= 2 && clean.length <= 80) {
        const noisy = /^[\s:)\-|]+/.test(businessRaw) || /\s[A-Za-z]{1,2}$/.test(businessRaw);
        const status =
          clean.length > 3 && !noisy && !/\(dba\)/i.test(businessRaw) ? "high" : "needs_review";
        fields.businessName = fieldResult(clean, status, businessRaw);
      }
    }

    const permitRaw = extractLabeledValue(body, [
      "health\\s+permit\\s*(?:#|no\\.?|number)",
      "permit\\s*(?:#|no\\.?|number)",
      "facility\\s+account",
      "fa\\s*#"
    ], { maxLen: 48 });
    const permitToken = normalizePermitNumberToken(permitRaw);
    if (permitToken) {
      fields.permitNumber = fieldResult(permitToken, permitNumberConfidence(permitToken), permitRaw);
    }

    const issueRaw = extractLabeledValue(body, ["issue\\s+date", "date\\s+issued", "issued\\s+on"], {
      maxLen: 36
    });
    const appDateRaw = extractLabeledValue(body, ["application\\s+date"], { maxLen: 36 });
    const issueIso = parseDateToIso(issueRaw);
    const ambiguousDates = [];
    if (!issueIso && issueRaw) ambiguousDates.push("issue");
    if (appDateRaw && /application/i.test(classification.label || "")) {
      ambiguousDates.push("application_vs_issue");
    }
    if (issueIso && classification.type !== "application") {
      fields.issueDate = fieldResult(issueIso, "high", issueRaw);
    } else if (issueRaw && classification.type !== "application") {
      fields.issueDate = fieldResult("", "needs_review", issueRaw);
    }

    const expRaw = extractLabeledValue(body, [
      "expir(?:ation|es)\\s+date",
      "valid\\s+through",
      "expires\\s+on"
    ], { maxLen: 36 });
    const expIso = parseDateToIso(expRaw);
    if (expIso) {
      fields.expirationDate = fieldResult(expIso, "high", expRaw);
    } else if (expRaw) ambiguousDates.push("expiration");

    const permitType = extractPermitTypeValue(body, classification);
    if (permitType) {
      fields.permitType = fieldResult(permitType.value, permitType.status, permitType.source);
    }

    const agency = extractLabeledValue(body, ["issuing\\s+agency", "issued\\s+by"], { maxLen: 100 });
    const agencyValue = agency ? trimBeforeNextLabel(agency) : extractIssuingAgency(text);
    if (agencyValue) {
      const agencyStatus =
        /county.+environmental\s+health|department\s+of\s+environmental\s+health/i.test(agencyValue)
          ? "high"
          : "needs_review";
      fields.issuingAgency = fieldResult(agencyValue, agencyStatus, agencyValue);
    }

    return { fields, ambiguousDates };
  }

  function validateReviewStep(values, checks) {
    const businessOk = (values.businessName ?? "").trim() !== "";
    const issueOk = !(values.issueDate ?? "").trim() || checks.confirmIssue;
    const expirationOk = !(values.expirationDate ?? "").trim() || checks.confirmExpiration;
    return businessOk && issueOk && expirationOk && checks.confirmTransfer;
  }

  const api = {
    FIELD_KEYS,
    ALLOWED_IMAGE_TYPES,
    ALLOWED_EXTENSIONS,
    MAX_FILE_BYTES,
    isAllowedImage,
    fileSizeError,
    classifyDocument,
    extractFields,
    validateReviewStep,
    parseDateToIso,
    looksLikePhoneOrZip
  };

  root.PermitOcrEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : window);