import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'astro';

/**
 * Builds every fixture under test/fixtures once, sequentially, before any build test file runs.
 * Test files run in parallel in isolated module graphs, so building from the tests themselves
 * could run concurrent `astro build`s over the same dist. New fixture dirs are picked up automatically.
 */
export default async function setup(): Promise<void> {
  const fixtures = new URL('../fixtures/', import.meta.url);
  const names = readdirSync(fixtures, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  for (const name of names) {
    const root = fileURLToPath(new URL(`${name}/`, fixtures));
    try {
      await build({ root, logLevel: 'error' });
    } catch (e) {
      throw new Error(`build of fixture "${name}" failed: ${(e as Error).message}`, { cause: e });
    }
  }
}
