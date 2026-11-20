/**
 * California County Wizard — loads county permit source links from /api/county-sources.
 */
const COUNTY_SOURCES_ENDPOINT = "/api/county-sources";

function createCountySourcesFetcher({
  fetchImpl = fetch,
  endpoint = COUNTY_SOURCES_ENDPOINT
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

      if (!response.ok) {
        throw new Error(`County sources request failed (${response.status})`);
      }

      const payload = await response.json();

      if (!payload || !Array.isArray(payload.counties)) {
        throw new Error("County sources response was invalid.");
      }

      return payload;
    })().finally(() => {
      inFlight = null;
    });

    return inFlight;
  }

  return { fetchCountyPermitSources, getInFlight: () => inFlight };
}

function initCaliforniaCountyWizard() {
  const root = document.getElementById("california-county-wizard");
  const statusEl = document.getElementById("countySourcesStatus");
  const listEl = document.getElementById("countySourcesList");
  const retryBtn = document.getElementById("countySourcesRetryBtn");

  if (!root || !statusEl || !listEl) {
    return;
  }

  const { fetchCountyPermitSources } = createCountySourcesFetcher();
  let isLoading = false;

  function setStatus(state, message) {
    statusEl.hidden = !message;
    statusEl.textContent = message || "";
    statusEl.classList.remove(
      "county-wizard-status--loading",
      "county-wizard-status--error"
    );

    if (state === "loading") {
      statusEl.classList.add("county-wizard-status--loading");
    } else if (state === "error") {
      statusEl.classList.add("county-wizard-status--error");
    }
  }

  function setRetryVisible(visible) {
    if (!retryBtn) return;
    retryBtn.hidden = !visible;
    retryBtn.disabled = isLoading;
  }

  function renderCountySources(data) {
    listEl.replaceChildren();

    data.counties.forEach((county) => {
      const card = document.createElement("article");
      card.className = "county-wizard-card";

      const title = document.createElement("h3");
      title.textContent = county.name;

      const summary = document.createElement("p");
      summary.textContent = county.summary || "";

      const links = document.createElement("div");
      links.className = "county-wizard-links";

      if (county.permitInfoUrl) {
        const permitLink = document.createElement("a");
        permitLink.href = county.permitInfoUrl;
        permitLink.target = "_blank";
        permitLink.rel = "noopener noreferrer";
        permitLink.textContent = "Permit information";
        links.append(permitLink);
      }

      if (county.environmentalHealthUrl) {
        const healthLink = document.createElement("a");
        healthLink.href = county.environmentalHealthUrl;
        healthLink.target = "_blank";
        healthLink.rel = "noopener noreferrer";
        healthLink.textContent = "Environmental health";
        links.append(healthLink);
      }

      card.append(title, summary, links);
      listEl.append(card);
    });

    listEl.hidden = data.counties.length === 0;
  }

  async function loadCountySources() {
    if (isLoading) {
      return;
    }

    isLoading = true;
    setRetryVisible(false);
    setStatus("loading", "Loading California county permit sources…");
    listEl.hidden = true;
    root.setAttribute("aria-busy", "true");

    try {
      const data = await fetchCountyPermitSources();
      renderCountySources(data);
      setStatus(null, "");
    } catch (error) {
      console.error("California County Wizard:", error);
      setStatus(
        "error",
        "We couldn't load county permit sources right now. Please check your connection and try again."
      );
      setRetryVisible(true);
    } finally {
      isLoading = false;
      root.removeAttribute("aria-busy");
      if (retryBtn) retryBtn.disabled = false;
    }
  }

  retryBtn?.addEventListener("click", () => {
    if (!isLoading) loadCountySources();
  });

  loadCountySources();
}

document.addEventListener("DOMContentLoaded", initCaliforniaCountyWizard);

if (typeof window !== "undefined") {
  window.createCountySourcesFetcher = createCountySourcesFetcher;
}