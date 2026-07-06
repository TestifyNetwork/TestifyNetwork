// Shared utilities for add_ministry — extracted so they can be unit tested.

/** Returns the first node in a JSON tree whose `type` field equals `targetType`. */
export function findByTypeInJSON(node: any, targetType: string): any {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findByTypeInJSON(item, targetType);
      if (found) return found;
    }
    return undefined;
  }

  if (node && typeof node === "object") {
    if (node.type === targetType) return node;

    for (const key of Object.keys(node)) {
      const found = findByTypeInJSON(node[key], targetType);
      if (found) return found;
    }
  }

  return undefined;
}

/** Returns ALL nodes in a JSON tree whose `type` field equals `targetType`. */
export function findAllByTypeInJSON(node: any, targetType: string): any[] {
  const matches: any[] = [];

  function traverse(n: any) {
    if (Array.isArray(n)) {
      for (const item of n) traverse(item);
    } else if (n && typeof n === "object") {
      if (n.type === targetType) matches.push(n);
      for (const key of Object.keys(n)) traverse(n[key]);
    }
  }

  traverse(node);
  return matches;
}

/**
 * Reads a Perplexity SSE stream and returns the parsed JSON events.
 * Stops when it sees `data: [DONE]` or the stream closes.
 * Returns the array of events and the last event separately for convenience.
 */
export async function readSSEStream(body: ReadableStream<Uint8Array>): Promise<any[]> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const events: any[] = [];
  let buffer = "";
  let done = false;

  console.log("SSE stream: starting read");

  while (!done) {
    const { done: streamDone, value } = await reader.read();
    if (streamDone) {
      console.log("SSE stream: connection closed by server");
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") {
        console.log(`SSE stream: received [DONE], stopping after ${events.length} events`);
        done = true;
        break;
      }
      try {
        events.push(JSON.parse(payload));
        if (events.length % 25 === 0) {
          console.log(`SSE stream: received ${events.length} events so far...`);
        }
      } catch {
        console.error(`SSE stream: failed to parse chunk: ${payload}`);
      }
    }
  }

  return events;
}

/**
 * Replaces inline citation markers like [3] or [1][4] with markdown links.
 * `urls` must have "EMPTY" at index 0 so citation IDs map directly to indices.
 */
export function injectCitationLinks(report: string, urls: string[]): string {
  return report.replace(/\[(\d+)\]/g, (_match: string, idStr: string) => {
    const id = parseInt(idStr, 10);
    const url = urls[id];
    if (url && url !== "EMPTY") {
      return `[\[${id}\]](${url})`;
    }
    return `[${idStr}]`;
  });
}
