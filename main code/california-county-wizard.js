/**
 * California County Wizard — county sources + questionnaire preview.
 */
const COUNTY_SOURCES_ENDPOINT = "/api/county-sources";
const COUNTY_SOURCES_FALLBACK = "./data/county-sources.json";

function createCountySourcesFetcher({
  fetchImpl = fetch,
  endpoint = COUNTY_SOURCES_ENDPOINT,
  fallbackEndpoint = COUNTY_SOURCES_FALLBACK
} = {}) {
  let inFlight = null;

  async function fetchCountyPermitSources() {
    if (inFlight) {
      return inFlight;
    }

    inFlight = (async () => {
      const response = await fetchImpl(endpoint, {
        headers: { Accept: "application/json" },
        credentials: "same-origin"
      });

      if (response.ok) {
        const payload = await response.json();
        if (!payload || !Array.isArray(payload.counties)) {
          throw new Error("County sources response was invalid.");
        }
        return { payload, source: "api" };
      }

      if (response.status !== 404 && response.status !== 405) {
        throw new Error(`County sources request failed (${response.status})`);
      }

      const fallbackResponse = await fetchImpl(fallbackEndpoint, {
        headers: { Accept: "application/json" }
      });
      if (!fallbackResponse.ok) {
        throw new Error(`County sources fallback failed (${fallbackResponse.status})`);
      }
      const payload = await fallbackResponse.json();
      if (!payload || !Array.isArray(payload.counties)) {
        throw new Error("County sources fallback was invalid.");
      }
      return { payload, source: "static-json" };
    })().finally(() => {
      inFlight = null;
    });

    return inFlight;
  }

  return { fetchCountyPermitSources, getInFlight: () => inFlight };
}

function findCountyById(catalog, countyId) {
  if (!countyId || !catalog?.counties) return null;
  return catalog.counties.find((county) => county.id === countyId) || null;
}

const VERIFICATION_PRESENTATION = {
  verified: {
    label: "Verified",
    hint: "Confirmed in county source catalog"
  },
  demo: {
    label: "Demo template",
    hint: "Illustrative — not an official county form"
  },
  pending: {
    label: "Awaiting verification",
    hint: "Not yet verified in this catalog"
  },
  unavailable: {
    label: "Unavailable",
    hint: "No preview in catalog"
  }
};

function catalogStatusForDepartmentLinks(county) {
  const tier = county?.sourceTier;
  if (tier === "verified") return "verified";
  if (tier === "demo") return "demo";
  if (tier === "pending") return "pending";
  return "pending";
}

function catalogStatusForQuestionnairePreview(county) {
  const preview = county?.questionnairePreview;
  if (!preview?.sections?.length) return "unavailable";
  const tier = preview.tier;
  if (tier === "verified") return "verified";
  if (tier === "demo") return "demo";
  if (tier === "pending") return "pending";
  return "pending";
}

function catalogStatusForInAppWorkflow(county) {
  const support = county?.applicationSupport;
  if (support === "full") return "verified";
  if (support === "sources-only") return "demo";
  return "pending";
}

function deriveCountyVerification(county) {
  return {
    departmentLinks: catalogStatusForDepartmentLinks(county),
    questionnairePreview: catalogStatusForQuestionnairePreview(county),
    inAppWorkflow: catalogStatusForInAppWorkflow(county)
  };
}

function formatVerificationPill(status) {
  const presentation = VERIFICATION_PRESENTATION[status] || VERIFICATION_PRESENTATION.pending;
  const safeStatus = VERIFICATION_PRESENTATION[status] ? status : "pending";
  return `<span class="county-wizard-verify-pill county-wizard-verify-pill--${escapeHtml(safeStatus)}" title="${escapeHtml(presentation.hint)}">${escapeHtml(presentation.label)}</span>`;
}

function buildVerificationStripHtml(county, { aspects = "all" } = {}) {
  const verification = deriveCountyVerification(county);
  const rows = [];

  if (aspects === "all" || aspects === "departmentLinks") {
    rows.push(
      `<li class="county-wizard-verify-item"><span class="county-wizard-verify-aspect">Department links</span>${formatVerificationPill(verification.departmentLinks)}</li>`
    );
  }
  if (aspects === "all" || aspects === "questionnairePreview") {
    rows.push(
      `<li class="county-wizard-verify-item"><span class="county-wizard-verify-aspect">Questionnaire preview</span>${formatVerificationPill(verification.questionnairePreview)}</li>`
    );
  }
  if (aspects === "all" || aspects === "inAppWorkflow") {
    rows.push(
      `<li class="county-wizard-verify-item"><span class="county-wizard-verify-aspect">In-app application</span>${formatVerificationPill(verification.inAppWorkflow)}</li>`
    );
  }

  return `<div class="county-wizard-verify"><p class="county-wizard-verify-heading">Source verification (from catalog)</p><ul class="county-wizard-verify-list" role="list">${rows.join("")}</ul></div>`;
}

function buildQuestionnairePreview(county) {
  if (!county?.questionnairePreview?.sections?.length) {
    return {
      tier: "unavailable",
      title: "Questionnaire preview unavailable",
      sections: [],
      html: "<p class=\"county-wizard-preview-empty\">No preview template is available for this county.</p>"
    };
  }

  const preview = county.questionnairePreview;
  const previewStatus = catalogStatusForQuestionnairePreview(county);
  const presentation = VERIFICATION_PRESENTATION[previewStatus] || VERIFICATION_PRESENTATION.pending;

  const sectionsHtml = preview.sections
    .map((section) => {
      const items = (section.items || [])
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join("");
      return `<section class="county-wizard-preview-section"><h4>${escapeHtml(section.name)}</h4><ul>${items}</ul></section>`;
    })
    .join("");

  return {
    tier: preview.tier,
    verificationStatus: previewStatus,
    title: preview.title,
    sections: preview.sections,
    html: `
      ${buildVerificationStripHtml(county, { aspects: "questionnairePreview" })}
      <p class="county-wizard-preview-tier county-wizard-preview-tier--${escapeHtml(previewStatus)}">${escapeHtml(presentation.label)} — ${escapeHtml(presentation.hint)}</p>
      <h3 class="county-wizard-preview-title">${escapeHtml(preview.title)}</h3>
      <div class="county-wizard-preview-sections">${sectionsHtml}</div>
    `
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function initCaliforniaCountyWizard() {
  const root = document.getElementById("california-county-wizard");
  const statusEl = document.getElementById("countySourcesStatus");
  const selectEl = document.getElementById("countyWizardSelect");
  const detailEl = document.getElementById("countyWizardDetail");
  const previewEl = document.getElementById("countyQuestionnairePreview");
  const unavailableEl = document.getElementById("countyWizardUnavailable");
  const retryBtn = document.getElementById("countySourcesRetryBtn");
  const dataSourceNote = document.getElementById("countyWizardDataSource");

  if (!root || !statusEl || !selectEl) {
    return;
  }

  const { fetchCountyPermitSources } = createCountySourcesFetcher();
  let isLoading = false;
  let catalog = null;

  function setStatus(state, message) {
    statusEl.hidden = !message;
    statusEl.textContent = message || "";
    statusEl.classList.remove(
      "county-wizard-status--loading",
      "county-wizard-status--error"
    );
    if (state === "loading") statusEl.classList.add("county-wizard-status--loading");
    if (state === "error") statusEl.classList.add("county-wizard-status--error");
  }

  function setRetryVisible(visible) {
    if (!retryBtn) return;
    retryBtn.hidden = !visible;
    retryBtn.disabled = isLoading;
  }

  function populateCountySelect() {
    selectEl.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select a California county";
    placeholder.disabled = true;
    placeholder.selected = true;
    selectEl.append(placeholder);

    catalog?.counties?.forEach((county) => {
      const option = document.createElement("option");
      option.value = county.id;
      option.textContent = county.name;
      selectEl.append(option);
    });

    const other = document.createElement("option");
    other.value = "__unsupported__";
    other.textContent = "Other county (not in catalog)";
    selectEl.append(other);
  }

  function renderCountyDetail(county) {
    if (!detailEl) return;
    detailEl.hidden = false;
    detailEl.replaceChildren();

    const verifyWrap = document.createElement("div");
    verifyWrap.innerHTML = buildVerificationStripHtml(county);

    const note = document.createElement("p");
    note.className = "county-wizard-source-note";
    note.textContent = county.sourceTierNote || county.summary || "";

    const summary = document.createElement("p");
    summary.textContent = county.summary || "";

    const links = document.createElement("div");
    links.className = "county-wizard-links";
    if (county.permitInfoUrl) {
      const permit = document.createElement("a");
      permit.href = county.permitInfoUrl;
      permit.target = "_blank";
      permit.rel = "noopener noreferrer";
      permit.textContent = "Permit information";
      links.append(permit);
    }
    if (county.environmentalHealthUrl) {
      const health = document.createElement("a");
      health.href = county.environmentalHealthUrl;
      health.target = "_blank";
      health.rel = "noopener noreferrer";
      health.textContent = "Environmental health";
      links.append(health);
    }

    const support = document.createElement("p");
    support.className = "county-wizard-support";
    support.textContent =
      county.applicationSupport === "full"
        ? "MarketKey ships the full Alameda questionnaire and PDF workflow."
        : "MarketKey provides source links only for this county — no county PDF is shipped.";

    detailEl.append(verifyWrap, note, summary, links, support);
  }

  function renderUnavailable(message) {
    detailEl && (detailEl.hidden = true);
    previewEl && (previewEl.hidden = true);
    if (unavailableEl) {
      unavailableEl.hidden = false;
      unavailableEl.textContent = message;
    }
  }

  function hideUnavailable() {
    if (unavailableEl) unavailableEl.hidden = true;
  }

  function renderQuestionnairePreview(county) {
    if (!previewEl) return;
    const built = buildQuestionnairePreview(county);
    previewEl.hidden = false;
    previewEl.dataset.previewTier = built.tier;
    previewEl.dataset.countyId = county.id;
    previewEl.innerHTML = built.html;
  }

  function onCountySelectionChange() {
    const countyId = selectEl.value;
    hideUnavailable();

    if (!countyId) {
      detailEl && (detailEl.hidden = true);
      previewEl && (previewEl.hidden = true);
      return;
    }

    if (countyId === "__unsupported__") {
      renderUnavailable(
        "This county is not in the MarketKey catalog yet. Check your local environmental health department — we have not added verified sources or a questionnaire preview."
      );
      return;
    }

    const county = findCountyById(catalog, countyId);
    if (!county) {
      renderUnavailable("The selected county could not be found in the loaded catalog. Try reloading sources.");
      return;
    }

    renderCountyDetail(county);
    renderQuestionnairePreview(county);
  }

  async function loadCountySources() {
    if (isLoading) return;

    isLoading = true;
    setRetryVisible(false);
    setStatus("loading", "Loading California county permit sources…");
    selectEl.disabled = true;
    root.setAttribute("aria-busy", "true");

    try {
      const { payload, source } = await fetchCountyPermitSources();
      catalog = payload;
      populateCountySelect();
      selectEl.disabled = false;
      if (dataSourceNote) {
        const catalogLine = catalog?.catalogNotice ? ` ${catalog.catalogNotice}` : "";
        dataSourceNote.textContent =
          (source === "api"
            ? "Loaded from /api/county-sources."
            : "Loaded from ./data/county-sources.json (local fallback).") + catalogLine;
      }
      setStatus(null, "");
    } catch (error) {
      console.error("California County Wizard:", error);
      setStatus(
        "error",
        "We couldn't load county permit sources right now. Please check your connection and try again."
      );
      setRetryVisible(true);
      catalog = null;
      selectEl.disabled = true;
    } finally {
      isLoading = false;
      root.removeAttribute("aria-busy");
      if (retryBtn) retryBtn.disabled = false;
    }
  }

  selectEl.addEventListener("change", onCountySelectionChange);
  retryBtn?.addEventListener("click", () => {
    if (!isLoading) loadCountySources();
  });

  loadCountySources();
}

document.addEventListener("DOMContentLoaded", initCaliforniaCountyWizard);

if (typeof window !== "undefined") {
  window.createCountySourcesFetcher = createCountySourcesFetcher;
  window.buildQuestionnairePreview = buildQuestionnairePreview;
  window.findCountyById = findCountyById;
  window.deriveCountyVerification = deriveCountyVerification;
}