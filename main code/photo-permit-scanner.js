/**
 * Photo Permit Scanner — demo prototype (no live OCR or county verification).
 */
(function initPhotoPermitScanner() {
  const DEMO_EXTRACTION = {
    permitNumber: "FA-2024-01892",
    businessName: "Rivera Fresh Foods",
    issueDate: "2024-03-15",
    expirationDate: "2025-03-14",
    permitType: "Temporary Food Facility (TFF)"
  };

  const els = {};
  let previewObjectUrl = null;
  let scanState = "idle"; // idle | scanning | extracted

  function $(id) {
    return document.getElementById(id);
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
    els.fileInput.value = "";
    els.previewImg.removeAttribute("src");
    els.previewImg.hidden = true;
    els.previewPlaceholder.hidden = false;
    els.scanBtn.disabled = true;
    els.scanStatus.textContent = "";
    Object.values(els.fields).forEach((input) => {
      input.value = "";
      input.disabled = true;
    });
    els.confirmIssueDate.checked = false;
    els.confirmExpirationDate.checked = false;
    els.confirmTransfer.checked = false;
    els.continueBtn.disabled = true;
    setStep("upload");
  }

  function showExtractionBadge(fieldKey) {
    return `<span class="permit-scanner-tag permit-scanner-tag--ocr" data-field-tag="${fieldKey}">Demo extraction — not verified</span>`;
  }

  function applyDemoExtraction() {
    const values = { ...DEMO_EXTRACTION };
    Object.entries(els.fields).forEach(([key, input]) => {
      input.value = values[key] || "";
      input.disabled = false;
    });
    scanState = "extracted";
    els.scanStatus.innerHTML = `${showExtractionBadge("status")}<span class="permit-scanner-scan-note">Prototype scan complete. Values are sample data for demonstration — not read from your photo.</span>`;
    setStep("extract");
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
    const fieldsOk = Object.values(els.fields).every((input) => input.value.trim());
    els.continueBtn.disabled = !(datesOk && transferOk && fieldsOk);
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
    const key = question?.pdfFieldKey || questionId;

    if (typeof appState !== "undefined" && key !== "faNumber" && key !== "FANumber") {
      appState.formData[key] = value;
    }
  }

  function storePermitNumberForPdf(permitNumber) {
    if (typeof appState === "undefined" || !permitNumber) return;
    appState.formData.FANumber = permitNumber;
    appState.formData.faNumber = permitNumber;
  }

  function buildConfirmSummary() {
    return [
      ["Business name", "businessName", els.fields.businessName.value],
      ["Permit number", "permitNumber", els.fields.permitNumber.value],
      ["Issue date → Application Date", "issueDate", els.fields.issueDate.value],
      ["Expiration date → Event End Date", "expirationDate", els.fields.expirationDate.value],
      ["Permit type (reference only)", "permitType", els.fields.permitType.value]
    ];
  }

  function renderConfirmSummary() {
    els.confirmList.replaceChildren();
    buildConfirmSummary().forEach(([label, key, value]) => {
      const row = document.createElement("li");
      row.className = "permit-scanner-confirm-row";
      row.innerHTML = `<strong>${label}</strong><span>${value}</span>${showExtractionBadge(key)}`;
      els.confirmList.append(row);
    });
  }

  function showConfirmationStep() {
    if (els.continueBtn.disabled) return;
    renderConfirmSummary();
    setStep("confirm");
  }

  async function transferToApplication() {

    if (typeof switchView === "function") switchView("app");
    if (typeof appState !== "undefined") appState.path = "tff";
    if (typeof showScreen === "function") showScreen("screen3");
    if (typeof showFormPage === "function") showFormPage(1);

    if (typeof loadQuestionnaire === "function") {
      await loadQuestionnaire();
    }

    setApplicationField("businessName", els.fields.businessName.value.trim());
    storePermitNumberForPdf(els.fields.permitNumber.value.trim());
    const applicationDate = $("applicationDate");
    if (applicationDate) {
      applicationDate.value = els.fields.issueDate.value;
      applicationDate.dispatchEvent(new Event("input", { bubbles: true }));
      if (typeof appState !== "undefined") {
        appState.formData.todaysDate = els.fields.issueDate.value;
      }
    }
    setApplicationField("endDate", els.fields.expirationDate.value);

    els.transferResult.hidden = false;
    els.transferResult.textContent =
      "Confirmed fields were copied into the questionnaire as draft answers. Official permit status was not checked.";
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
  }

  function bindEvents() {
    els.fileInput?.addEventListener("change", onFileSelected);
    els.scanBtn?.addEventListener("click", runScan);
    els.scanBtnClear?.addEventListener("click", resetScanner);

    [
      els.confirmIssueDate,
      els.confirmExpirationDate,
      els.confirmTransfer,
      ...Object.values(els.fields)
    ].forEach((node) => node?.addEventListener("input", validateConfirmStep));
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