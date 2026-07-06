import { assertEquals, assertExists } from "jsr:@std/assert";
import { findByTypeInJSON, findAllByTypeInJSON, readSSEStream, injectCitationLinks } from "../supabase/functions/add_ministry/utils.ts";

// Helper: build a ReadableStream from an array of SSE string chunks
function makeStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

// ── readSSEStream ─────────────────────────────────────────────────────────────

Deno.test("readSSEStream: parses events and stops at [DONE]", async () => {
  const stream = makeStream([
    'data: {"type":"delta","text":"hello"}\n\n',
    'data: {"type":"delta","text":"world"}\n\n',
    'data: [DONE]\n\n',
    // anything after [DONE] should be ignored
    'data: {"type":"should_not_appear"}\n\n',
  ]);

  const events = await readSSEStream(stream);
  assertEquals(events.length, 2);
  assertEquals(events[0].text, "hello");
  assertEquals(events[1].text, "world");
});

Deno.test("readSSEStream: handles chunks split across read() calls", async () => {
  // Simulate a single SSE line arriving in two separate network chunks
  const stream = makeStream([
    'data: {"type":"delt',
    'a","text":"split"}\n\n',
    'data: [DONE]\n\n',
  ]);

  const events = await readSSEStream(stream);
  assertEquals(events.length, 1);
  assertEquals(events[0].text, "split");
});

Deno.test("readSSEStream: returns empty array when stream closes without [DONE]", async () => {
  const stream = makeStream([]);
  const events = await readSSEStream(stream);
  assertEquals(events.length, 0);
});

Deno.test("readSSEStream: skips non-data lines (comments, keep-alives)", async () => {
  const stream = makeStream([
    ': keep-alive\n\n',
    'data: {"type":"event"}\n\n',
    'data: [DONE]\n\n',
  ]);

  const events = await readSSEStream(stream);
  assertEquals(events.length, 1);
  assertEquals(events[0].type, "event");
});

// ── findByTypeInJSON ──────────────────────────────────────────────────────────

Deno.test("findByTypeInJSON: finds a node at the top level", () => {
  const result = findByTypeInJSON({ type: "output_text", text: "hello" }, "output_text");
  assertExists(result);
  assertEquals(result.text, "hello");
});

Deno.test("findByTypeInJSON: finds a deeply nested node", () => {
  const tree = { output: [{ items: [{ type: "output_text", text: "deep" }] }] };
  const result = findByTypeInJSON(tree, "output_text");
  assertExists(result);
  assertEquals(result.text, "deep");
});

Deno.test("findByTypeInJSON: returns undefined when type is not found", () => {
  const result = findByTypeInJSON({ type: "other", data: {} }, "output_text");
  assertEquals(result, undefined);
});

Deno.test("findByTypeInJSON: returns first match when multiple exist", () => {
  const tree = [
    { type: "output_text", text: "first" },
    { type: "output_text", text: "second" },
  ];
  const result = findByTypeInJSON(tree, "output_text");
  assertEquals(result?.text, "first");
});

// ── findAllByTypeInJSON ───────────────────────────────────────────────────────

Deno.test("findAllByTypeInJSON: collects all matching nodes", () => {
  const tree = {
    queries: [
      { type: "search_results", results: [{ url: "https://a.com" }] },
      { type: "search_results", results: [{ url: "https://b.com" }] },
    ],
  };
  const results = findAllByTypeInJSON(tree, "search_results");
  assertEquals(results.length, 2);
});

Deno.test("findAllByTypeInJSON: returns empty array when none found", () => {
  const results = findAllByTypeInJSON({ type: "other" }, "search_results");
  assertEquals(results.length, 0);
});

// ── injectCitationLinks ───────────────────────────────────────────────────────

Deno.test("injectCitationLinks: replaces citation markers with markdown links", () => {
  const urls = ["EMPTY", "https://example.com", "https://other.com"];
  const result = injectCitationLinks("See [1] and [2] for details.", urls);
  assertEquals(result, "See [[1]](https://example.com) and [[2]](https://other.com) for details.");
});

Deno.test("injectCitationLinks: leaves marker unchanged when URL is missing", () => {
  const urls = ["EMPTY", "https://example.com"];
  const result = injectCitationLinks("See [1] and [9] for details.", urls);
  assertEquals(result, "See [[1]](https://example.com) and [9] for details.");
});

Deno.test("injectCitationLinks: handles no citation markers", () => {
  const urls = ["EMPTY", "https://example.com"];
  const result = injectCitationLinks("No citations here.", urls);
  assertEquals(result, "No citations here.");
});
