// MIN-01 — Any Member (or Admin) may register a ministry by submitting
// identifying information; Testify identifies the ministry via Perplexity.
//
// Runs against a real local Supabase stack (see scripts/test.sh) rather than
// a fake table — only Perplexity and the NRM doc fetch are mocked, since
// those are genuine third-party APIs. The DB is reset once for the whole
// test run, not per test, so each test uses a unique ministry name to avoid
// tripping add_ministry's duplicate-name check against another test's row.
//
// The "asks the registering member to confirm before proceeding" half of
// MIN-01 is a client-side gate today (SearchPage.tsx) with no server-side
// enforcement yet — see server/leader.test.ts for that TDD gap.
import { assertEquals, assertRejects } from "@std/assert";
import { afterAll, afterEach, beforeAll, describe, it } from "@std/testing/bdd";
import { mswServer } from "../mocks/server.ts";
import { createPerplexityHandlers, type PerplexityAgentOutcome } from "../mocks/perplexity.ts";
import { createNrmHandler } from "../mocks/nrm.ts";
import { createSupabasePassthroughHandler } from "../mocks/passthrough.ts";
import { installEdgeRuntimeStub } from "../mocks/edge_runtime.ts";
import { requireEnv } from "../support/env.ts";
import { createServiceRoleClient, getMinistry, seedMinistry, uniqueMinistryName } from "../support/ministry_reports.ts";

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const PUBLISHABLE_KEY = requireEnv("SUPABASE_PUBLISHABLE_KEY");

// Test setup/assertions bypass RLS deliberately — this file exercises
// add_ministry's own logic (which uses its own scoped client), not RLS.
const db = createServiceRoleClient();

Deno.env.set("PERPLEXITY_KEY", "test-perplexity-key");

const mod = await import("../../add_ministry/index.ts");
const handler = mod.default.fetch;

function makeRequest(body: unknown): Request {
  return new Request(`${SUPABASE_URL}/functions/v1/add_ministry`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: PUBLISHABLE_KEY },
    body: JSON.stringify(body),
  });
}

describe("MIN-01: add_ministry identification flow", () => {
  let edgeRuntime: ReturnType<typeof installEdgeRuntimeStub>;

  beforeAll(() => {
    mswServer.listen({ onUnhandledRequest: "error" });
  });

  afterEach(() => {
    mswServer.resetHandlers();
  });

  afterAll(() => {
    mswServer.close();
  });

  function setupHandlers(perplexityOutcome: PerplexityAgentOutcome = {}) {
    edgeRuntime = installEdgeRuntimeStub();
    mswServer.use(
      createSupabasePassthroughHandler(SUPABASE_URL),
      ...createPerplexityHandlers(perplexityOutcome),
      createNrmHandler(),
    );
  }

  it("rejects a submission missing ministryName or identifiableFact", async () => {
    setupHandlers();
    await assertRejects(
      () => handler(makeRequest({ ministryName: uniqueMinistryName("Living Waters Ministry") })),
      Error,
      'Missing "ministryName" or "identifiableFact"',
    );
  });

  it("rejects registering a ministry that already exists", async () => {
    setupHandlers();
    const name = uniqueMinistryName("Living Waters Ministry");
    await seedMinistry(db, { ministry_name: name });

    const res = await handler(makeRequest({ ministryName: name, identifiableFact: "based in Austin, TX" }));

    assertEquals(res.status, 409);
    const body = await res.json();
    assertEquals(body.error, `A report for "${name}" already exists in the database.`);
  });

  it("accepts identifying info, creates the ministry, and has Testify identify it via Perplexity", async () => {
    setupHandlers({ reportText: "Living Waters Ministry serves rural Kenya." });
    const name = uniqueMinistryName("Living Waters Ministry");

    const res = await handler(
      makeRequest({ ministryName: name, identifiableFact: "that operates in rural Kenya" }),
    );

    assertEquals(res.status, 202);
    const body = await res.json();
    assertEquals(body.ministry_name, name);

    await edgeRuntime.waitFor();

    const row = await getMinistry(db, body.ministry_id);
    assertEquals(row?.status, "not_verified");
    assertEquals(row?.generated_report, "Living Waters Ministry serves rural Kenya.");
    assertEquals(row?.generated_citations, ["EMPTY", "https://example.com/source-1"]);
  });

  it("marks the ministry as errored if Testify can't identify it from Perplexity's response", async () => {
    setupHandlers({ omitOutputText: true });
    const name = uniqueMinistryName("Living Waters Ministry");

    const res = await handler(makeRequest({ ministryName: name, identifiableFact: "that operates in rural Kenya" }));
    assertEquals(res.status, 202);
    const body = await res.json();

    await edgeRuntime.waitFor();

    const row = await getMinistry(db, body.ministry_id);
    assertEquals(row?.status, "error");
  });
});
