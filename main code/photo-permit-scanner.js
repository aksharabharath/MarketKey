/**
 * Photo Permit Scanner — browser OCR (Tesseract.js) + rule-based extraction.
 * No county verification. Only Business Name transfers to the TFF questionnaire.
 */
(function initPhotoPermitScanner() {
  const TESSERACT_VERSION = "5.1.1";
  const TESSERACT_SRC = `https://cdn.jsdelivr.net/npm/tesseract.js@${TESSERACT_VERSION}/dist/tesseract.min.js`;
  const OCR_TIMEOUT_MS = 120000;
  const MAX_OCR_DIMENSION = 2000;

  const Engine = () => window.PermitOcrEngine;
  const FIELD_KEYS = () => Engine().FIELD_KEYS;

  const TRANSFER_TO_QUESTIONNAIRE = {
    businessName: { questionId: "businessName", storageKey: "BusinessName" }
  };

  const els = {};
  let previewObjectUrl = null;
  let ocrObjectUrl = null;
  let scanState = "idle";
  let detectedValues = {};
  let fieldMeta = {};
  let classification = null;
  let rawOcrText = "";
  let transferCompleted = false;
  let ocrJobId = 0;
  let activeWorker = null;
  let tesseractLoadPromise = null;

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

  function isAllowedImage(file) {
    return Engine().isAllowedImage(file);
  }

  function getFieldValue(key) {
    return (els.fields[key]?.value ?? "").trim();
  }

  function getCorrectedValues() {
    return FIELD_KEYS().reduce((values, key) => {
      values[key] = getFieldValue(key);
      return values;
    }, {});
  }

  function statusLabel(key) {
    const meta = fieldMeta[key];
    if (!meta || !meta.status) return "";
    if (meta.status === "high") return "High confidence (OCR)";
    if (meta.status === "needs_review") return "Needs review (OCR)";
    return "Not detected";
  }

  function fieldProvenance(key) {
    const current = getFieldValue(key);
    const detected = (detectedValues[key] ?? "").trim();
    const base = statusLabel(key);

    if (!detected && !current) {
      return { kind: "uncertain", label: "Not detected — enter manually" };
    }
    if (!detected && current) {
      return { kind: "filled", label: "Entered by you (not from OCR)" };
    }
    if (detected && current === detected) {
      return {
        kind: "detected",
        label: base ? `${base}` : "From OCR — confirm below"
      };
    }
    return { kind: "corrected", label: "Corrected by you" };
  }

  function updateFieldStatus(key) {
    const wrap = els.fieldWraps[key];
    const statusEl = els.fieldStatuses[key];
    if (!wrap || !statusEl) return;

    const provenance = fieldProvenance(key);
    statusEl.textContent = provenance.label;
    statusEl.className = `permit-scanner-field-status permit-scanner-field-status--${provenance.kind}`;

    wrap.classList.remove("permit-scanner-field--corrected", "permit-scanner-field--uncertain");
    if (provenance.kind === "corrected" || provenance.kind === "filled") {
      wrap.classList.add("permit-scanner-field--corrected");
    } else if (provenance.kind === "uncertain") {
      wrap.classList.add("permit-scanner-field--uncertain");
    }
  }

  function updateAllFieldStatuses() {
    FIELD_KEYS().forEach(updateFieldStatus);
    syncDateConfirmVisibility();
  }

  function syncDateConfirmVisibility() {
    const issueRow = els.confirmIssueDate?.closest(".permit-scanner-check");
    const expRow = els.confirmExpirationDate?.closest(".permit-scanner-check");
    const issueHasValue = Boolean(getFieldValue("issueDate"));
    const expHasValue = Boolean(getFieldValue("expirationDate"));
    if (issueRow) issueRow.hidden = !issueHasValue;
    if (expRow) expRow.hidden = !expHasValue;
    if (!issueHasValue) els.confirmIssueDate.checked = false;
    if (!expHasValue) els.confirmExpirationDate.checked = false;
  }

  function setStep(step) {
    els.steps.forEach((panel) => {
      panel.hidden = panel.dataset.scannerStep !== step;
    });
    els.stepper?.querySelectorAll("[data-step-target]").forEach((dot) => {
      dot.classList.toggle("active", dot.dataset.stepTarget === step);
    });
  }

  function revokeOcrUrl() {
    if (ocrObjectUrl) {
      URL.revokeObjectURL(ocrObjectUrl);
      ocrObjectUrl = null;
    }
  }

  function revokePreview() {
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
      previewObjectUrl = null;
    }
  }

  function setRawTextDisplay(text) {
    if (!els.rawTextPre) return;
    els.rawTextPre.textContent = text || "(no text recognized)";
  }

  function showClassificationBanner(info) {
    if (!els.classBanner) return;
    if (!info) {
      els.classBanner.hidden = true;
      els.classBanner.textContent = "";
      return;
    }
    els.classBanner.hidden = false;
    els.classBanner.className = "permit-scanner-class-banner";
    if (info.type === "unrelated" || info.type === "uncertain") {
      els.classBanner.classList.add("permit-scanner-class-banner--warn");
    } else if (info.type === "application") {
      els.classBanner.classList.add("permit-scanner-class-banner--info");
    } else {
      els.classBanner.classList.add("permit-scanner-class-banner--ok");
    }
    els.classBanner.innerHTML = `<strong>${escapeHtml(info.label)}</strong><span>${escapeHtml(info.reason)}</span>`;
  }

  function showUnrecognized(info) {
    if (!els.unrecognizedPanel) return;
    els.unrecognizedPanel.hidden = false;
    const missing = (info.missingSignals || []).map((s) => `• ${s}`).join(" ");
    els.unrecognizedPanel.innerHTML = `<p><strong>${escapeHtml(info.label)}</strong></p><p>${escapeHtml(info.reason)}</p>${
      missing ? `<p class="permit-scanner-missing-signals">${escapeHtml(missing)}</p>` : ""
    }<p>Upload a clearer photo of a health permit, or enter details manually after a recognized scan.</p>`;
    if (els.reviewFields) els.reviewFields.hidden = true;
    if (els.reviewActions) els.reviewActions.hidden = true;
  }

  function hideUnrecognized() {
    if (els.unrecognizedPanel) els.unrecognizedPanel.hidden = true;
    if (els.reviewFields) els.reviewFields.hidden = false;
    if (els.reviewActions) els.reviewActions.hidden = false;
  }

  function clearExtractionSession({ keepImageReady = false } = {}) {
    detectedValues = {};
    fieldMeta = {};
    classification = null;
    rawOcrText = "";
    scanState = "idle";
    setRawTextDisplay("");
    showClassificationBanner(null);
    hideUnrecognized();
    FIELD_KEYS().forEach((key) => {
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
    if (!keepImageReady) els.scanBtn.disabled = true;
    revokeOcrUrl();
  }

  function resetScanner() {
    cancelOcr();
    revokePreview();
    transferCompleted = false;
    els.fileInput.value = "";
    els.previewImg.removeAttribute("src");
    els.previewImg.hidden = true;
    els.previewPlaceholder.hidden = false;
    els.scanStatus.textContent = "";
    els.transferResult.hidden = true;
    els.transferResult.textContent = "";
    if (els.cancelOcrBtn) els.cancelOcrBtn.hidden = true;
    if (els.transferBtn) {
      els.transferBtn.disabled = false;
      els.transferBtn.textContent = "Apply confirmed fields to application";
      els.transferBtn.removeAttribute("aria-disabled");
    }
    clearExtractionSession();
    setStep("upload");
  }

  function loadTesseract() {
    if (typeof Tesseract !== "undefined") return Promise.resolve();
    if (tesseractLoadPromise) return tesseractLoadPromise;
    tesseractLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-tesseract="${TESSERACT_VERSION}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () =>
          reject(new Error("OCR library failed to load. Check your connection and refresh."))
        );
        if (typeof Tesseract !== "undefined") resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = TESSERACT_SRC;
      script.defer = true;
      script.dataset.tesseract = TESSERACT_VERSION;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("OCR library failed to load from CDN. Check your connection."));
      document.head.appendChild(script);
    });
    return tesseractLoadPromise;
  }

  function loadImageElement(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not read image for OCR."));
      img.src = src;
    });
  }

  async function prepareImageForOcr(imageUrl) {
    const img = await loadImageElement(imageUrl);
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    const maxSide = Math.max(w, h);
    if (maxSide > MAX_OCR_DIMENSION) {
      const scale = MAX_OCR_DIMENSION / maxSide;
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not available for OCR.");
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Could not prepare image for OCR.");
    revokeOcrUrl();
    ocrObjectUrl = URL.createObjectURL(blob);
    return ocrObjectUrl;
  }

  async function cancelOcr() {
    ocrJobId += 1;
    if (activeWorker) {
      try {
        await activeWorker.terminate();
      } catch (_e) {
        /* terminate errors are non-fatal */
      }
      activeWorker = null;
    }
    scanState = "idle";
    if (els.cancelOcrBtn) els.cancelOcrBtn.hidden = true;
    if (els.scanBtn) els.scanBtn.disabled = !previewObjectUrl;
  }

  function setOcrProgress(message) {
    els.scanStatus.textContent = message;
  }

  async function runOcrRecognize(imageUrl, jobId) {
    const worker = await Tesseract.createWorker("eng", 1, {
      logger: (m) => {
        if (jobId !== ocrJobId) return;
        if (m.status === "recognizing text" && m.progress != null) {
          setOcrProgress(`Reading text… ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    activeWorker = worker;
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("OCR timed out. Try a smaller or clearer image.")), OCR_TIMEOUT_MS)
    );
    const recognize = worker.recognize(imageUrl);
    const result = await Promise.race([recognize, timeout]);
    await worker.terminate();
    if (jobId !== ocrJobId) return null;
    activeWorker = null;
    return result?.data?.text ?? "";
  }

  function applyExtraction(classResult, extraction) {
    detectedValues = {};
    fieldMeta = {};
    FIELD_KEYS().forEach((key) => {
      const result = extraction.fields[key] || { value: "", status: "not_detected" };
      fieldMeta[key] = { status: result.status, source: result.source };
      detectedValues[key] = result.value || "";
      const input = els.fields[key];
      if (!input) return;
      input.value = detectedValues[key];
      input.disabled = false;
    });
    scanState = "extracted";
    hideUnrecognized();
    showClassificationBanner(classResult);
    setStep("extract");
    updateAllFieldStatuses();
    validateConfirmStep();
  }

  async function runScan() {
    const file = els.fileInput.files?.[0];
    if (!file) {
      setOcrProgress("Choose an image before running OCR.");
      return;
    }
    const sizeErr = Engine().fileSizeError(file);
    if (sizeErr) {
      setOcrProgress(sizeErr);
      return;
    }
    if (!isAllowedImage(file)) {
      setOcrProgress("Please choose a JPG, JPEG, PNG, or WebP image (not PDF).");
      return;
    }

    const jobId = ++ocrJobId;
    scanState = "scanning";
    els.scanBtn.disabled = true;
    if (els.cancelOcrBtn) els.cancelOcrBtn.hidden = false;
    clearExtractionSession({ keepImageReady: true });
    setOcrProgress("Loading OCR engine…");

    try {
      await loadTesseract();
      if (jobId !== ocrJobId) return;

      setOcrProgress("Preparing image…");
      const ocrUrl = await prepareImageForOcr(previewObjectUrl);
      if (jobId !== ocrJobId) return;

      setOcrProgress("Running OCR in your browser…");
      const text = await runOcrRecognize(ocrUrl, jobId);
      if (jobId !== ocrJobId) return;

      rawOcrText = text || "";
      setRawTextDisplay(rawOcrText);

      if (!rawOcrText.trim()) {
        setOcrProgress("No readable text found. Try a clearer, well-lit photo.");
        scanState = "idle";
        return;
      }

      classification = Engine().classifyDocument(rawOcrText);
      const extraction = Engine().extractFields(rawOcrText, classification);

      if (classification.type === "unrelated" || classification.type === "uncertain") {
        showClassificationBanner(classification);
        showUnrecognized(classification);
        setStep("extract");
        scanState = "unrecognized";
        setOcrProgress("Document could not be recognized as a health permit.");
        return;
      }

      if (classification.type === "application") {
        showClassificationBanner(classification);
        applyExtraction(classification, extraction);
        setOcrProgress(
          "OCR complete — identified as an application form. Review fields; this is not an issued permit."
        );
        return;
      }

      applyExtraction(classification, extraction);
      setOcrProgress("OCR complete. Review extracted text and edit fields before continuing.");
    } catch (error) {
      if (jobId !== ocrJobId) return;
      setOcrProgress(error.message || "OCR failed. Try again or use a clearer image.");
      scanState = "idle";
    } finally {
      if (jobId === ocrJobId) {
        if (els.cancelOcrBtn) els.cancelOcrBtn.hidden = true;
        if (els.scanBtn) els.scanBtn.disabled = !previewObjectUrl;
      }
    }
  }

  function validateConfirmStep() {
    if (scanState === "unrecognized") {
      els.continueBtn.disabled = true;
      return;
    }
    const corrected = getCorrectedValues();
    const ok = Engine().validateReviewStep(corrected, {
      confirmIssue: els.confirmIssueDate.checked,
      confirmExpiration: els.confirmExpirationDate.checked,
      confirmTransfer: els.confirmTransfer.checked
    });
    els.continueBtn.disabled = !ok;
  }

  function onFieldEdited(key) {
    if (key === "issueDate") els.confirmIssueDate.checked = false;
    if (key === "expirationDate") els.confirmExpirationDate.checked = false;
    updateFieldStatus(key);
    validateConfirmStep();
  }

  function setApplicationField(questionId, value) {
    const trimmed = (value ?? "").trim();
    if (!trimmed) return false;

    const question =
      typeof questionnaireQuestions !== "undefined"
        ? questionnaireQuestions.find((item) => item.id === questionId)
        : null;
    const storageKey = question?.pdfFieldKey || questionId;

    if (typeof appState !== "undefined") {
      appState.formData[storageKey] = trimmed;
    }

    const input = $(questionId);
    if (input) {
      input.value = trimmed;
      input.dispatchEvent(
        new Event(input.tagName === "SELECT" ? "change" : "input", { bubbles: true })
      );
    }
    return true;
  }

  function buildConfirmSummary() {
    const corrected = getCorrectedValues();
    const labels = {
      businessName: "Business name",
      permitNumber: "Permit number",
      issueDate: "Issue date",
      expirationDate: "Expiration date",
      permitType: "Permit type",
      issuingAgency: "Issuing agency"
    };
    return FIELD_KEYS().map((key) => ({
      label: labels[key] || key,
      key,
      value: corrected[key] || "—",
      transfers: key === "businessName"
    }));
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
    return '<span class="permit-scanner-tag permit-scanner-tag--ocr">From OCR</span>';
  }

  function renderConfirmSummary() {
    els.confirmList.replaceChildren();
    buildConfirmSummary().forEach((row) => {
      const li = document.createElement("li");
      li.className = "permit-scanner-confirm-row";
      const key = row.key;
      const detectedHint =
        (detectedValues[key] ?? "").trim() && fieldProvenance(key).kind === "corrected"
          ? `<span class="permit-scanner-confirm-detected">OCR had: ${escapeHtml(detectedValues[key])}</span>`
          : "";
      const transferNote = row.transfers
        ? '<span class="permit-scanner-confirm-transfer">Transfers to TFF Business Name</span>'
        : '<span class="permit-scanner-confirm-transfer permit-scanner-confirm-transfer--ref">Reference only — not copied to questionnaire</span>';
      li.innerHTML = `<strong>${escapeHtml(row.label)}</strong><span>${escapeHtml(row.value)}</span>${provenanceTag(key)}${transferNote}${detectedHint}`;
      els.confirmList.append(li);
    });
  }

  function showConfirmationStep() {
    if (els.continueBtn.disabled) return;
    renderConfirmSummary();
    setStep("confirm");
  }

  function backToReview() {
    setStep("extract");
    validateConfirmStep();
  }

  async function transferToApplication() {
    if (transferCompleted) return;

    const corrected = getCorrectedValues();
    const businessName = corrected.businessName.trim();
    if (!businessName) {
      setOcrProgress("Business name is required before transfer.");
      setStep("extract");
      return;
    }

    const priorFormData = typeof appState !== "undefined" ? { ...appState.formData } : {};

    if (typeof switchView === "function") switchView("app");
    if (typeof appState !== "undefined") {
      appState.path = "tff";
      appState.formData = { ...priorFormData };
      appState.formData[TRANSFER_TO_QUESTIONNAIRE.businessName.storageKey] = businessName;
    }
    if (typeof showScreen === "function") showScreen("screen3");
    if (typeof showFormPage === "function") showFormPage(1);

    if (typeof loadQuestionnaire === "function") {
      await loadQuestionnaire();
    }

    setApplicationField(TRANSFER_TO_QUESTIONNAIRE.businessName.questionId, businessName);

    transferCompleted = true;
    els.transferBtn.disabled = true;
    els.transferBtn.textContent = "Transfer complete";
    els.transferBtn.setAttribute("aria-disabled", "true");

    const referenceParts = [];
    if (corrected.permitNumber) referenceParts.push(`permit #${corrected.permitNumber}`);
    if (corrected.issueDate) referenceParts.push(`issued ${corrected.issueDate}`);
    if (corrected.expirationDate) referenceParts.push(`expires ${corrected.expirationDate}`);
    if (corrected.permitType) referenceParts.push(corrected.permitType);
    if (corrected.issuingAgency) referenceParts.push(corrected.issuingAgency);

    const referenceLine = referenceParts.length
      ? ` Reference (not transferred): ${referenceParts.join("; ")}.`
      : "";

    els.transferResult.hidden = false;
    els.transferResult.textContent = `Business Name was copied into the TFF questionnaire as an unverified OCR draft.${referenceLine} County records were not consulted.`;
    setStep("done");
  }

  function onFileSelected() {
    const file = els.fileInput.files?.[0];
    if (!file) {
      resetScanner();
      return;
    }

    const sizeErr = Engine().fileSizeError(file);
    if (sizeErr) {
      els.fileInput.value = "";
      setOcrProgress(sizeErr);
      els.scanBtn.disabled = true;
      return;
    }

    if (!isAllowedImage(file)) {
      els.fileInput.value = "";
      setOcrProgress(
        "Unsupported file type. Upload a JPG, JPEG, PNG, or WebP image (PDF not supported)."
      );
      els.scanBtn.disabled = true;
      return;
    }

    cancelOcr();
    clearExtractionSession({ keepImageReady: true });
    transferCompleted = false;
    if (els.transferBtn) {
      els.transferBtn.disabled = false;
      els.transferBtn.textContent = "Apply confirmed fields to application";
      els.transferBtn.removeAttribute("aria-disabled");
    }

    revokePreview();
    previewObjectUrl = URL.createObjectURL(file);
    els.previewImg.src = previewObjectUrl;
    els.previewImg.hidden = false;
    els.previewPlaceholder.hidden = true;
    els.scanBtn.disabled = false;
    setOcrProgress("Image ready. Run OCR when you are ready (processed locally in your browser).");
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
    els.cancelOcrBtn = $("permitScannerCancelOcr");
    els.scanStatus = $("permitScannerStatus");
    els.scanBtnClear = $("permitScannerClearBtn");
    els.steps = els.root.querySelectorAll("[data-scanner-step]");
    els.stepper = $("permitScannerStepper");
    els.classBanner = $("permitScannerClassBanner");
    els.unrecognizedPanel = $("permitScannerUnrecognized");
    els.reviewFields = $("permitScannerReviewFields");
    els.reviewActions = $("permitScannerReviewActions");
    els.rawTextPre = $("permitScannerRawText");
    els.confirmList = $("permitScannerConfirmList");
    els.confirmIssueDate = $("permitScannerConfirmIssue");
    els.confirmExpirationDate = $("permitScannerConfirmExpiration");
    els.confirmTransfer = $("permitScannerConfirmTransfer");
    els.continueBtn = $("permitScannerContinueBtn");
    els.backToReviewBtn = $("permitScannerBackToReview");
    els.transferBtn = $("permitScannerTransferBtn");
    els.transferResult = $("permitScannerTransferResult");
    els.openFromLanding = $("openPermitScannerBtn");
    els.fields = {
      permitNumber: $("permitScannerPermitNumber"),
      businessName: $("permitScannerBusinessName"),
      issueDate: $("permitScannerIssueDate"),
      expirationDate: $("permitScannerExpirationDate"),
      permitType: $("permitScannerPermitType"),
      issuingAgency: $("permitScannerIssuingAgency")
    };
    els.fieldStatuses = {};
    els.fieldWraps = {};
    FIELD_KEYS().forEach((key) => {
      els.fieldStatuses[key] = els.root.querySelector(`[data-field-status="${key}"]`);
      els.fieldWraps[key] = els.root.querySelector(`.permit-scanner-field[data-field-key="${key}"]`);
    });
  }

  function bindEvents() {
    els.fileInput?.addEventListener("change", onFileSelected);
    els.scanBtn?.addEventListener("click", () => runScan());
    els.cancelOcrBtn?.addEventListener("click", () => cancelOcr());
    els.scanBtnClear?.addEventListener("click", resetScanner);

    FIELD_KEYS().forEach((key) => {
      els.fields[key]?.addEventListener("input", () => onFieldEdited(key));
      els.fields[key]?.addEventListener("change", () => onFieldEdited(key));
    });

    [els.confirmIssueDate, els.confirmExpirationDate, els.confirmTransfer].forEach((node) =>
      node?.addEventListener("change", validateConfirmStep)
    );

    els.continueBtn?.addEventListener("click", showConfirmationStep);
    els.backToReviewBtn?.addEventListener("click", backToReview);
    els.transferBtn?.addEventListener("click", transferToApplication);

    els.openFromLanding?.addEventListener("click", () => {
      els.root.scrollIntoView({ behavior: "smooth", block: "start" });
      els.fileInput?.focus();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.PermitOcrEngine) return;
    cacheElements();
    if (!els.root) return;
    bindEvents();
    syncDateConfirmVisibility();
    setStep("upload");
  });

  if (typeof window !== "undefined") {
    window.permitScannerTestApi = {
      TESSERACT_VERSION,
      TRANSFER_TO_QUESTIONNAIRE,
      validateReviewStep: (values, checks) => Engine().validateReviewStep(values, checks),
      isAllowedImage: (file) => Engine().isAllowedImage(file),
      classifyDocument: (text) => Engine().classifyDocument(text),
      extractFields: (text, cls) => Engine().extractFields(text, cls)
    };
  }
})();