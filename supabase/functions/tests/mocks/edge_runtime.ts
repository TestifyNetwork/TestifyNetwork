// add_ministry.ts calls the ambient `EdgeRuntime.waitUntil(...)` global that
// only exists inside Supabase's actual Edge Runtime. Under `deno test` that
// global doesn't exist, so we stub it and let tests await the background
// work deterministically instead of it running fire-and-forget.
export function installEdgeRuntimeStub(): { waitFor: () => Promise<void> } {
  const pending: Promise<unknown>[] = [];

  (globalThis as unknown as { EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void } }).EdgeRuntime = {
    waitUntil(promise: Promise<unknown>) {
      pending.push(promise.catch(() => {}));
    },
  };

  return {
    waitFor: async () => {
      await Promise.all(pending);
    },
  };
}
