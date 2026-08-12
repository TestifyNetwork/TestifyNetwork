// MIN-01 — "...Testify identifies the ministry and asks the registering
// member to confirm before proceeding."
//
// TDD: today PATCH /ministry/:id/leader has NO server-side confirmation
// guard — it accepts leader info regardless of whether a report was ever
// generated or reviewed (the Correct/Incorrect step in SearchPage.tsx is
// UI-only and can be bypassed by calling this route directly). The cases
// below assert the target behavior agreed with the team: the route should
// reject finalizing registration unless the ministry has reached a status
// that means "Testify has identified it and it's awaiting/received human
// confirmation" (not_verified or verified) — and reject while still
// waiting_generation or after a failed identification (error).
//
// The waiting_generation / error cases are expected to FAIL until that
// guard is added to supabase/functions/server/index.tsx.
//
// Runs against a real local Supabase stack (see scripts/test.sh) rather than
// a fake table. The DB is reset once for the whole test run, not per test,
// so each test seeds its own uniquely-named ministry row.
import { assertEquals } from "@std/assert";
import { afterAll, afterEach, describe, it } from "@std/testing/bdd";
import { mswServer } from "../mocks/server.ts";
import { createSupabasePassthroughHandler } from "../mocks/passthrough.ts";
import { requireEnv } from "../support/env.ts";
import { createServiceRoleClient, getMinistry, seedMinistry, uniqueMinistryName } from "../support/ministry_reports.ts";
import { SERVER_PREFIX } from "../../server/constants.ts";

const SUPABASE_URL = requireEnv("SUPABASE_URL");
requireEnv("SUPABASE_SERVICE_ROLE_KEY");

// Test setup/assertions bypass RLS deliberately — this file exercises the
// leader-PATCH route's own confirmation-gate logic, not RLS.
const db = createServiceRoleClient();

// server/index.tsx constructs its Supabase client once at module top-level,
// so MSW must already be intercepting fetch before this import runs — the
// beforeAll() hook below would fire too late, after the client has already
// captured an unpatched fetch reference.
mswServer.listen({ onUnhandledRequest: "error" });
mswServer.use(createSupabasePassthroughHandler(SUPABASE_URL));
const { app } = await import("../../server/index.tsx");

function patchLeader(id: string, body: unknown = { leaderName: "Pastor John Smith", leaderEmail: "pastor@ministry.org" }) {
  return app.fetch(
    new Request(`http://localhost/${SERVER_PREFIX}/ministry/${encodeURIComponent(id)}/leader`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("MIN-01: PATCH /ministry/:id/leader confirmation gate", () => {
  afterEach(() => {
    mswServer.resetHandlers();
    mswServer.use(createSupabasePassthroughHandler(SUPABASE_URL));
  });

  afterAll(() => {
    mswServer.close();
  });

  it("rejects a request missing leaderName or leaderEmail (existing behavior)", async () => {
    const row = await seedMinistry(db, { ministry_name: uniqueMinistryName("Living Waters Ministry"), status: "not_verified" });

    const res = await patchLeader(row.ministry_id, { leaderName: "Pastor John Smith" });

    assertEquals(res.status, 400);
  });

  it("rejects confirming a ministry that's still waiting on identification (TDD, expected to fail today)", async () => {
    const row = await seedMinistry(db, { ministry_name: uniqueMinistryName("Living Waters Ministry"), status: "waiting_generation" });

    const res = await patchLeader(row.ministry_id);

    assertEquals(res.status, 409);
    assertEquals((await getMinistry(db, row.ministry_id))?.ministry_leader_name, undefined);
  });

  it("rejects confirming a ministry Testify failed to identify (TDD, expected to fail today)", async () => {
    const row = await seedMinistry(db, { ministry_name: uniqueMinistryName("Living Waters Ministry"), status: "error" });

    const res = await patchLeader(row.ministry_id);

    assertEquals(res.status, 409);
    assertEquals((await getMinistry(db, row.ministry_id))?.ministry_leader_name, undefined);
  });

  it("accepts leader info once Testify has identified the ministry (not_verified)", async () => {
    const row = await seedMinistry(db, { ministry_name: uniqueMinistryName("Living Waters Ministry"), status: "not_verified" });

    const res = await patchLeader(row.ministry_id);

    assertEquals(res.status, 200);
    assertEquals((await getMinistry(db, row.ministry_id))?.ministry_leader_name, "Pastor John Smith");
  });

  it("accepts leader info for an already-verified ministry", async () => {
    const row = await seedMinistry(db, { ministry_name: uniqueMinistryName("Living Waters Ministry"), status: "verified" });

    const res = await patchLeader(row.ministry_id);

    assertEquals(res.status, 200);
    assertEquals((await getMinistry(db, row.ministry_id))?.ministry_leader_name, "Pastor John Smith");
  });
});
