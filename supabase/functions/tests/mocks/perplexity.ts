// Handlers for the Perplexity endpoints add_ministry's background task calls:
// a streaming "/v1/agent" report-generation call, and two "/search" calls
// (990s, annual reports).
import { http, HttpResponse } from "msw";

export interface PerplexityAgentOutcome {
  reportText?: string;
  modelName?: string;
  citations?: { id: number; url: string }[];
  /** Simulate the "output structure differs from expected" failure path. */
  omitOutputText?: boolean;
}

function buildAgentSSEBody(outcome: PerplexityAgentOutcome): string {
  // deno-lint-ignore no-explicit-any
  const output: any[] = [];
  if (!outcome.omitOutputText) {
    output.push({ type: "output_text", text: outcome.reportText ?? "Generated report body." });
  }
  output.push({
    type: "search_results",
    results: outcome.citations ?? [{ id: 1, url: "https://example.com/source-1" }],
  });

  const completedEvent = {
    type: "response.completed",
    response: {
      error: null,
      model: outcome.modelName ?? "test-perplexity-model",
      output,
    },
  };

  return `data: ${JSON.stringify(completedEvent)}\n\ndata: [DONE]\n\n`;
}

export function createPerplexityHandlers(outcome: PerplexityAgentOutcome = {}) {
  return [
    http.post("https://api.perplexity.ai/v1/agent", () => {
      return new HttpResponse(buildAgentSSEBody(outcome), {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    }),
    http.post("https://api.perplexity.ai/search", () => {
      return HttpResponse.json({
        results: [{ url: "https://example.com/990-report.pdf" }],
      });
    }),
  ];
}
