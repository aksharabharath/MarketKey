/**
 * Unit tests for county-sources fetch deduplication and error handling.
 * Run: node scripts/test-california-county-wizard.mjs
 */

function createCountySourcesFetcher({ fetchImpl, endpoint = "/api/county-sources" }) {
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

  return { fetchCountyPermitSources };
}

async function assertDedup() {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 40));
    return {
      ok: true,
      async json() {
        return { counties: [{ name: "Alameda County" }] };
      }
    };
  };

  const { fetchCountyPermitSources } = createCountySourcesFetcher({ fetchImpl });
  const [a, b, c] = await Promise.all([
    fetchCountyPermitSources(),
    fetchCountyPermitSources(),
    fetchCountyPermitSources()
  ]);

  if (calls !== 1) {
    throw new Error(`Expected 1 network call, received ${calls}`);
  }
  if (a.counties.length !== 1 || b !== a || c !== a) {
    throw new Error("Deduplicated callers should share the same resolved payload");
  }
}

async function assertHttpError() {
  const fetchImpl = async () => ({
    ok: false,
    status: 503
  });

  const { fetchCountyPermitSources } = createCountySourcesFetcher({ fetchImpl });

  try {
    await fetchCountyPermitSources();
    throw new Error("Expected fetch to fail on non-OK response");
  } catch (error) {
    if (!/503/.test(error.message)) {
      throw error;
    }
  }
}

async function assertStaticApiFile() {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const filePath = path.join(process.cwd(), "main code", "api", "county-sources");
  const raw = await fs.readFile(filePath, "utf8");
  const json = JSON.parse(raw);
  if (!Array.isArray(json.counties) || json.counties.length < 1) {
    throw new Error("Static /api/county-sources fixture is missing counties");
  }
}

async function main() {
  await assertDedup();
  await assertHttpError();
  await assertStaticApiFile();
  console.log("California County Wizard tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});