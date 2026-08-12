// Required env vars come from scripts/test.sh (supabase status -o env), not
// from the test files themselves — this guards against someone running
// `deno test` directly and getting a confusing downstream failure instead.
export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(
      `${name} is not set. Run tests via \`deno task test\` (scripts/test.sh), ` +
        `which starts the local Supabase stack and exports the required env vars — not \`deno test\` directly.`,
    );
  }
  return value;
}
