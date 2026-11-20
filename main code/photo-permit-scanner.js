/**
 * Photo Permit Scanner — demo prototype (no live OCR or county verification).
 */
(function initPhotoPermitScanner() {
  const FIELD_KEYS = [
    "permitNumber",
    "businessName",
    "issueDate",
    "expirationDate",
    "permitType"
  ];

  const DEMO_EXTRACTION = {
    permitNumber: "",
    businessName: "Rivera Fresh Foods",
    issueDate: "2024-03-15",
    expirationDate: "2025-03-14",
    permitType: "Temporary Food Facility (TFF)"
  };

  const els = {};
  let previewObjectUrl = null;
  let scanState = "idle"; // idle | scanning | extracted
  let detectedValues = {};

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getFieldValue(key) {
    return (els.fields[key]?.value ?? "").trim();
  }

  function getCorrectedValues() {
    return FIELD_KEYS.reduce((values, key) => {
      values[key] = getFieldValue(key);
      return values;
    }, {});
  }

  function fieldProvenance(key) {
    const current = getFieldValue(key);
    const detected = (detectedValues[key] ?? "").trim();

    if (!detected && !current) {
      return { kind: "uncertain", label: "Not detected — enter manually" };
    }
    if (!detected && current) {
      return { kind: "filled", label: "Entered by you (not detected in demo scan)" };
    }
    if (detected && current === detected) {
      return { kind: "detected", label: "Matches detected demo value" };
    }
    return { kind: "corrected", label: "Corrected by you" };
  }

  function updateFieldStatus(key) {
    const wrap = els.fieldWraps[key];
    const statusEl = els.fieldStatuses[key];
    const input = els.fields[key];
    if (!wrap || !statusEl || !input) return;

    const provenance = fieldProvenance(key);
    statusEl.textContent = provenance.label;
    statusEl.className = `permit-scanner-field-status permit-scanner-field-status--${provenance.kind}`;

    wrap.classList.remove(
      "permit-scanner-field--corrected",
      "permit-scanner-field--uncertain"
    );
    if (provenance.kind === "corrected" || provenance.kind === "filled") {
      wrap.classList.add("permit-scanner-field--corrected");
    } else if (provenance.kind === "uncertain") {
      wrap.classList.add("permit-scanner-field--uncertain");
    }
  }

  function updateAllFieldStatuses() {
    FIELD_KEYS.forEach(updateFieldStatus);
  }

  function setStep(step) {
    els.steps.forEach((panel) => {
      const active = panel.dataset.scannerStep === step;
      panel.hidden = !active;
    });
    els.stepper?.querySelectorAll("[data-step-target]").forEach((dot) => {
      dot.classList.toggle("active", dot.dataset.stepTarget === step);
    });
  }

  function revokePreview() {
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
      previewObjectUrl = null;
    }
  }

  function resetScanner() {
    revokePreview();
    scanState = "idle";
    detectedValues = {};
    els.fileInput.value = "";
    els.previewImg.removeAttribute("src");
    els.previewImg.hidden = true;
    els.previewPlaceholder.hidden = false;
    els.scanBtn.disabled = true;
    els.scanStatus.textContent = "";
    FIELD_KEYS.forEach((key) => {
      const input = els.fields[key];
      if (!input) return;
      input.value = "";
      input.disabled = true;
    });
    els.confirmIssueDate.checked = false;
    els.confirmExpirationDate.checked = false;
    els.confirmTransfer.checked = false;
    els.continueBtn.disabled = true;
    updateAllFieldStatuses();
    setStep("upload");
  }

  function provenanceTag(key) {
    const provenance = fieldProvenance(key);
    if (provenance.kind === "corrected") {
      return '<span class="permit-scanner-tag permit-scanner-tag--corrected">Corrected</span>';
    }
    if (provenance.kind === "filled") {
      return '<span class="permit-scanner-tag permit-scanner-tag--user">You entered</span>';
    }
    if (provenance.kind === "uncertain") {
      return '<span class="permit-scanner-tag permit-scanner-tag--ocr">Missing</span>';
    }
    return '<span class="permit-scanner-tag permit-scanner-tag--ocr">Detected (demo)</span>';
  }

  function applyDemoExtraction() {
    detectedValues = { ...DEMO_EXTRACTION };
    FIELD_KEYS.forEach((key) => {
      const input = els.fields[key];
      if (!input) return;
      input.value = detectedValues[key] ?? "";
      input.disabled = false;
    });
    scanState = "extracted";
    els.scanStatus.innerHTML =
      '<span class="permit-scanner-tag permit-scanner-tag--ocr">Demo extraction — not verified</span>' +
      '<span class="permit-scanner-scan-note">Prototype scan complete. Review and edit every field below before continuing.</span>';
    setStep("extract");
    updateAllFieldStatuses();
    validateConfirmStep();
  }

  async function runScan() {
    if (!els.fileInput.files?.length) return;
    scanState = "scanning";
    els.scanBtn.disabled = true;
    els.scanStatus.textContent = "Scanning image (demo)…";

    await new Promise((resolve) => setTimeout(resolve, 900));

    applyDemoExtraction();
    els.scanBtn.disabled = false;
  }

  function validateConfirmStep() {
    const datesOk =
      els.confirmIssueDate.checked && els.confirmExpirationDate.checked;
    const transferOk = els.confirmTransfer.checked;
    const corrected = getCorrectedValues();
    const fieldsOk = FIELD_KEYS.every((key) => corrected[key] !== "");
    els.continueBtn.disabled = !(datesOk && transferOk && fieldsOk);
  }

  function onFieldEdited(key) {
    if (key === "issueDate") els.confirmIssueDate.checked = false;
    if (key === "expirationDate") els.confirmExpirationDate.checked = false;
    updateFieldStatus(key);
    validateConfirmStep();
  }

  function setApplicationField(questionId, value) {
    const input = $(questionId);
    if (!input || value === undefined || value === "") return;

    input.value = value;
    input.dispatchEvent(
      new Event(input.tagName === "SELECT" ? "change" : "input", { bubbles: true })
    );

    const question =
      typeof questionnaireQuestions !== "undefined"
        ? questionnaireQuestions.find((item) => item.id === questionId)
        : null;
    const storageKey = question?.pdfFieldKey || questionId;

    if (typeof appState !== "undefined" && storageKey !== "faNumber" && storageKey !== "FANumber") {
      appState.formData[storageKey] = value;
    }
  }

  function storePermitNumberForPdf(permitNumber) {
    if (typeof appState === "undefined" || !permitNumber) return;
    appState.formData.FANumber = permitNumber;
    appState.formData.faNumber = permitNumber;
  }

  function buildConfirmSummary() {
    const corrected = getCorrectedValues();
    return [
      ["Business name", "businessName", corrected.businessName],
      ["Permit number", "permitNumber", corrected.permitNumber],
      ["Issue date → Application Date", "issueDate", corrected.issueDate],
      ["Expiration date → Event End Date", "expirationDate", corrected.expirationDate],
      ["Permit type (reference only)", "permitType", corrected.permitType]
    ];
  }

  function renderConfirmSummary() {
    els.confirmList.replaceChildren();
    buildConfirmSummary().forEach(([label, key, value]) => {
      const row = document.createElement("li");
      row.className = "permit-scanner-confirm-row";
      const detectedHint =
        (detectedValues[key] ?? "").trim() &&
        fieldProvenance(key).kind === "corrected"
          ? `<span class="permit-scanner-confirm-detected">Was detected: ${escapeHtml(detectedValues[key])}</span>`
          : "";
      row.innerHTML = `<strong>${label}</strong><span>${escapeHtml(value)}</span>${provenanceTag(key)}${detectedHint}`;
      els.confirmList.append(row);
    });
  }

  function showConfirmationStep() {
    if (els.continueBtn.disabled) return;
    renderConfirmSummary();
    setStep("confirm");
  }

  async function transferToApplication() {
    const corrected = getCorrectedValues();

    if (typeof switchView === "function") switchView("app");
    if (typeof appState !== "undefined") appState.path = "tff";
    if (typeof showScreen === "function") showScreen("screen3");
    if (typeof showFormPage === "function") showFormPage(1);

    if (typeof loadQuestionnaire === "function") {
      await loadQuestionnaire();
    }

    setApplicationField("businessName", corrected.businessName);
    storePermitNumberForPdf(corrected.permitNumber);
    const applicationDate = $("applicationDate");
    if (applicationDate) {
      applicationDate.value = corrected.issueDate;
      applicationDate.dispatchEvent(new Event("input", { bubbles: true }));
      if (typeof appState !== "undefined") {
        appState.formData.todaysDate = corrected.issueDate;
      }
    }
    setApplicationField("endDate", corrected.expirationDate);

    els.transferResult.hidden = false;
    els.transferResult.textContent =
      "Your reviewed values were copied into the questionnaire as draft answers. Official permit status was not checked.";
    setStep("done");
  }

  function onFileSelected() {
    const file = els.fileInput.files?.[0];
    if (!file) {
      resetScanner();
      return;
    }

    if (!file.type.startsWith("image/")) {
      els.scanStatus.textContent = "Please choose an image file (JPEG, PNG, or WebP).";
      return;
    }

    revokePreview();
    previewObjectUrl = URL.createObjectURL(file);
    els.previewImg.src = previewObjectUrl;
    els.previewImg.hidden = false;
    els.previewPlaceholder.hidden = true;
    els.scanBtn.disabled = false;
    els.scanStatus.textContent = "Image ready. Run a demo scan when you are ready.";
    scanState = "idle";
    setStep("upload");
  }

  function cacheElements() {
    els.root = $("permitScanner");
    if (!els.root) return;

    els.fileInput = $("permitScannerFile");
    els.previewImg = $("permitScannerPreview");
    els.previewPlaceholder = $("permitScannerPreviewPlaceholder");
    els.scanBtn = $("permitScannerScanBtn");
    els.scanStatus = $("permitScannerStatus");
    els.scanBtnClear = $("permitScannerClearBtn");
    els.steps = els.root.querySelectorAll("[data-scanner-step]");
    els.stepper = $("permitScannerStepper");
    els.confirmList = $("permitScannerConfirmList");
    els.confirmIssueDate = $("permitScannerConfirmIssue");
    els.confirmExpirationDate = $("permitScannerConfirmExpiration");
    els.confirmTransfer = $("permitScannerConfirmTransfer");
    els.continueBtn = $("permitScannerContinueBtn");
    els.transferBtn = $("permitScannerTransferBtn");
    els.transferResult = $("permitScannerTransferResult");
    els.openFromLanding = $("openPermitScannerBtn");
    els.fields = {
      permitNumber: $("permitScannerPermitNumber"),
      businessName: $("permitScannerBusinessName"),
      issueDate: $("permitScannerIssueDate"),
      expirationDate: $("permitScannerExpirationDate"),
      permitType: $("permitScannerPermitType")
    };
    els.fieldStatuses = {};
    els.fieldWraps = {};
    FIELD_KEYS.forEach((key) => {
      els.fieldStatuses[key] = els.root.querySelector(`[data-field-status="${key}"]`);
      els.fieldWraps[key] = els.root.querySelector(`.permit-scanner-field[data-field-key="${key}"]`);
    });
  }

  function bindEvents() {
    els.fileInput?.addEventListener("change", onFileSelected);
    els.scanBtn?.addEventListener("click", runScan);
    els.scanBtnClear?.addEventListener("click", resetScanner);

    FIELD_KEYS.forEach((key) => {
      els.fields[key]?.addEventListener("input", () => onFieldEdited(key));
      els.fields[key]?.addEventListener("change", () => onFieldEdited(key));
    });

    [
      els.confirmIssueDate,
      els.confirmExpirationDate,
      els.confirmTransfer
    ].forEach((node) => node?.addEventListener("change", validateConfirmStep));

    els.continueBtn?.addEventListener("click", showConfirmationStep);
    els.transferBtn?.addEventListener("click", transferToApplication);

    els.openFromLanding?.addEventListener("click", () => {
      els.root.scrollIntoView({ behavior: "smooth", block: "start" });
      els.fileInput?.focus();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    cacheElements();
    if (!els.root) return;
    bindEvents();
    setStep("upload");
  });
})();