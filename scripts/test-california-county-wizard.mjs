/**
 * Tests for California County Wizard data, API artifacts, and preview generation.
 * Run: node scripts/test-california-county-wizard.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";

function createCountySourcesFetcher({ fetchImpl, endpoint = "/api/county-sources" }) {
  let inFlight = null;

  async function fetchCountyPermitSources() {
    if (inFlight) return inFlight;

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

  return { fetchCountyPermitSources };
}

function findCountyById(catalog, countyId) {
  return catalog?.counties?.find((county) => county.id === countyId) || null;
}

function buildQuestionnairePreview(county) {
  if (!county?.questionnairePreview?.sections?.length) {
    return { tier: "unavailable", title: "Questionnaire preview unavailable", sections: [] };
  }
  return {
    tier: county.questionnairePreview.tier,
    title: county.questionnairePreview.title,
    sections: county.questionnairePreview.sections
  };
}

function deriveCountyVerification(county) {
  function departmentLinks() {
    const tier = county?.sourceTier;
    if (tier === "verified") return "verified";
    if (tier === "demo") return "demo";
    if (tier === "pending") return "pending";
    return "pending";
  }
  function questionnairePreview() {
    const preview = county?.questionnairePreview;
    if (!preview?.sections?.length) return "unavailable";
    const tier = preview.tier;
    if (tier === "verified") return "verified";
    if (tier === "demo") return "demo";
    if (tier === "pending") return "pending";
    return "pending";
  }
  function inAppWorkflow() {
    const support = county?.applicationSupport;
    if (support === "full") return "verified";
    if (support === "sources-only") return "demo";
    return "pending";
  }
  return {
    departmentLinks: departmentLinks(),
    questionnairePreview: questionnairePreview(),
    inAppWorkflow: inAppWorkflow()
  };
}

async function loadCanonicalCatalog() {
  const filePath = path.join(process.cwd(), "main code", "data", "county-sources.json");
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function assertDedup() {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return { ok: true, async json() { return { counties: [{ id: "alameda", name: "Alameda County" }] }; } };
  };

  const { fetchCountyPermitSources } = createCountySourcesFetcher({ fetchImpl });
  await Promise.all([
    fetchCountyPermitSources(),
    fetchCountyPermitSources(),
    fetchCountyPermitSources()
  ]);
  if (calls !== 1) throw new Error(`Expected 1 network call, received ${calls}`);
}

async function assertHttpError() {
  const fetchImpl = async () => ({ ok: false, status: 503 });
  const { fetchCountyPermitSources } = createCountySourcesFetcher({ fetchImpl });
  try {
    await fetchCountyPermitSources();
    throw new Error("Expected fetch to fail on non-OK response");
  } catch (error) {
    if (!/503/.test(error.message)) throw error;
  }
}

async function assertStaticApiFixtureMatchesCanonical() {
  const canonical = await loadCanonicalCatalog();
  const staticPath = path.join(process.cwd(), "main code", "api", "county-sources");
  const staticJson = JSON.parse(await fs.readFile(staticPath, "utf8"));
  if (staticJson.updatedAt !== canonical.updatedAt) {
    throw new Error("Static /api/county-sources is out of sync with main code/data/county-sources.json");
  }
}

async function assertVercelHandlerPath() {
  const handlerPath = path.join(process.cwd(), "main code", "api", "county-sources.js");
  await fs.access(handlerPath);
  const body = await fs.readFile(handlerPath, "utf8");
  if (!body.includes("county-sources.json")) {
    throw new Error("Vercel handler does not read county-sources.json under main code/data");
  }
}

async function assertCountyPreviews() {
  const catalog = await loadCanonicalCatalog();
  const alameda = findCountyById(catalog, "alameda");
  const santaClara = findCountyById(catalog, "santa-clara");
  const unsupported = findCountyById(catalog, "kern");

  const alamedaPreview = buildQuestionnairePreview(alameda);
  const santaPreview = buildQuestionnairePreview(santaClara);
  const unsupportedPreview = buildQuestionnairePreview(unsupported);

  if (alamedaPreview.tier !== "verified" || alamedaPreview.sections.length < 3) {
    throw new Error("Alameda preview should be verified with multiple sections");
  }
  if (santaPreview.tier !== "demo" || santaPreview.title === alamedaPreview.title) {
    throw new Error("Santa Clara preview should be demo and distinct from Alameda");
  }
  if (unsupportedPreview.tier !== "unavailable") {
    throw new Error("Unsupported county should yield unavailable preview");
  }
}

async function assertVerificationStatusFromCatalog() {
  const catalog = await loadCanonicalCatalog();
  const alameda = findCountyById(catalog, "alameda");
  const santaClara = findCountyById(catalog, "santa-clara");

  const alamedaVerification = deriveCountyVerification(alameda);
  if (
    alamedaVerification.departmentLinks !== "verified" ||
    alamedaVerification.questionnairePreview !== "verified" ||
    alamedaVerification.inAppWorkflow !== "verified"
  ) {
    throw new Error("Alameda verification must be verified for links, preview, and in-app workflow");
  }

  const scVerification = deriveCountyVerification(santaClara);
  if (scVerification.departmentLinks !== "verified") {
    throw new Error("Santa Clara department links must stay verified only when catalog sourceTier is verified");
  }
  if (scVerification.questionnairePreview !== "demo" || scVerification.inAppWorkflow !== "demo") {
    throw new Error("Santa Clara preview and in-app workflow must be demo per catalog");
  }

  if (!catalog.verificationLegend?.verified) {
    throw new Error("Catalog must define verificationLegend for UI hints");
  }
}

async function main() {
  await assertDedup();
  await assertHttpError();
  await assertStaticApiFixtureMatchesCanonical();
  await assertVercelHandlerPath();
  await assertCountyPreviews();
  await assertVerificationStatusFromCatalog();
  console.log("California County Wizard tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});